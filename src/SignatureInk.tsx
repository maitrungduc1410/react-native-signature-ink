// High-level wrapper around the codegen-generated `SignatureInkView`.
// Owns the request-id ⇄ Promise back-channel for async commands
// (`toBase64`, `toFile`, `toSvg`, `isEmpty`, `getStrokeData`,
// `saveToPhotoLibrary`) and re-shapes native events into the public
// `Signature*Event` types declared in `./types`.
import * as React from 'react';
import { findNodeHandle, processColor } from 'react-native';
import SignatureInkNativeView, {
  Commands,
  type NativeProps,
} from './SignatureInkViewNativeComponent';
import type {
  ChangeEvent,
  ExportImageOptions,
  ReplayOptions,
  SavedToPhotoLibraryResult,
  SignatureInkHandle,
  SignatureInkProps,
  StrokeData,
} from './types';
import type { ToolbarItem } from './toolbar';

type NativeRef = React.ComponentRef<typeof SignatureInkNativeView>;

type PendingResolver = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  type: string;
};

// Unique-per-call request id. Native echoes it back on `onResult`
// so the wrapper can route the value to the right pending Promise.
let requestCounter = 0;
const nextRequestId = (): string => {
  requestCounter = (requestCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `req-${Date.now().toString(36)}-${requestCounter.toString(36)}`;
};

const parseMaybeJson = <T,>(value: string | undefined, fallback: T): T => {
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

// Built-in ids get readable labels (also shown as overflow menu titles)
// when the item has no `text` or explicit label, matching the native
// defaults instead of the raw lowercase id.
const BUILT_IN_LABELS: Readonly<Record<string, string>> = {
  undo: 'Undo',
  redo: 'Redo',
  clear: 'Clear',
  copy: 'Copy',
};

// Dev-only warnings are keyed by message so an inline `toolbarButtons`
// array (new identity every render) does not spam the console.
const warnedMessages = new Set<string>();
const warnOnce = (message: string): void => {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
};

// A toolbar action is dispatched purely by `id`, so two items sharing an
// id fire the same `onToolbarAction({ id })` (and, for a built-in id, run
// the native action twice) with no way for the handler to tell them apart.
const warnOnDuplicateToolbarIds = (items: ReadonlyArray<ToolbarItem>): void => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const { id } of items) {
    if (seen.has(id)) duplicates.add(id);
    else seen.add(id);
  }
  if (duplicates.size > 0) {
    const ids = Array.from(duplicates)
      .map((id) => `"${id}"`)
      .join(', ');
    warnOnce(
      `SignatureInk: duplicate toolbarButtons id(s) ${ids}. ` +
        'Each id should be unique: onToolbarAction is keyed by id and ' +
        'cannot distinguish duplicate buttons.'
    );
  }
};

// Normalize the public `toolbarButtons` items into the flat JSON shape
// the native side parses: colors are pre-processed to ints and the
// accessibility label is derived (text, built-in label, id) here so
// neither platform has to. Returns `''` when there are no items, which
// the native side reads as "use the default undo/redo/clear/copy toolbar".
const serializeToolbarItems = (
  input: ReadonlyArray<ToolbarItem | string> | undefined
): string => {
  if (input == null || input.length === 0) return '';
  // Before 1.1.0 `toolbarButtons` was an array of action ids. Keep
  // accepting that shape instead of silently falling back to defaults.
  const items: ToolbarItem[] = input.map((item) =>
    typeof item === 'string' ? ({ id: item } as ToolbarItem) : item
  );
  if (__DEV__) {
    warnOnDuplicateToolbarIds(items);
    if (input.some((item) => typeof item === 'string')) {
      warnOnce(
        'SignatureInk: string entries in toolbarButtons are deprecated. ' +
          "Pass objects instead, e.g. { id: 'undo' } or DefaultToolbarItems.undo."
      );
    }
  }
  const normalized = items.map((item) => {
    const processed =
      item.tintColor != null ? processColor(item.tintColor) : null;
    // PlatformColor / DynamicColorIOS process to an object that cannot
    // cross the JSON boundary; say so instead of dropping it silently.
    if (__DEV__ && processed != null && typeof processed !== 'number') {
      warnOnce(
        `SignatureInk: toolbarButtons item "${item.id}" has a tintColor ` +
          'that is not a plain color (PlatformColor / DynamicColorIOS). ' +
          'Per-item tints only support plain colors; it is ignored.'
      );
    }
    const text = item.text || null;
    return {
      id: item.id,
      icon: item.icon ?? null,
      text,
      tintColor: typeof processed === 'number' ? processed : null,
      accessibilityLabel:
        item.accessibilityLabel || text || BUILT_IN_LABELS[item.id] || item.id,
      disabled: item.disabled ?? false,
    };
  });
  return JSON.stringify(normalized);
};

/**
 * Native signature pad: PencilKit on iOS, a velocity-Bezier renderer on
 * Android. Size it with `style`, configure it with {@link SignatureInkProps}
 * and drive it through a {@link SignatureInkHandle} ref.
 *
 * @example
 * const ref = useRef<SignatureInkHandle>(null);
 *
 * <SignatureInk ref={ref} style={{ height: 240 }} showBaseline showToolbar />;
 *
 * const png = await ref.current?.toBase64({ trim: true });
 */
export const SignatureInk = React.forwardRef<
  SignatureInkHandle,
  SignatureInkProps
>(function SignatureInk(props, ref) {
  const {
    style,
    onBegin,
    onEnd,
    onChange,
    onReplayProgress,
    onToolbarAction,
    backgroundColor,
    toolbarButtons,
    toolbarMaxVisibleButtons,
    ...rest
  } = props;

  const toolbarItemsJson = React.useMemo(
    () => serializeToolbarItems(toolbarButtons),
    [toolbarButtons]
  );

  const nativeRef = React.useRef<NativeRef>(null);
  const pending = React.useRef<Map<string, PendingResolver>>(new Map());

  React.useEffect(() => {
    const current = pending.current;
    return () => {
      current.forEach(({ reject }) =>
        reject(new Error('SignatureInk unmounted'))
      );
      current.clear();
    };
  }, []);

  const send = React.useCallback(
    <T,>(
      type: string,
      dispatch: (id: string) => void,
      transform?: (value: string | undefined) => T
    ): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const node = nativeRef.current;
        if (!node) {
          reject(new Error('SignatureInk: native view is not mounted yet'));
          return;
        }
        const id = nextRequestId();
        pending.current.set(id, {
          type,
          resolve: (raw: string | undefined) => {
            resolve(transform ? transform(raw) : (raw as unknown as T));
          },
          reject,
        });
        try {
          dispatch(id);
        } catch (e) {
          pending.current.delete(id);
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      });
    },
    []
  );

  const handle = React.useMemo<SignatureInkHandle>(
    () => ({
      clear: () => {
        const node = nativeRef.current;
        if (node) Commands.clear(node);
      },
      undo: () => {
        const node = nativeRef.current;
        if (node) Commands.undo(node);
      },
      redo: () => {
        const node = nativeRef.current;
        if (node) Commands.redo(node);
      },
      copyToClipboard: () => {
        const node = nativeRef.current;
        if (node) Commands.copyToClipboard(node);
      },
      replay: (options?: ReplayOptions) => {
        const node = nativeRef.current;
        if (node) Commands.replay(node, options?.speed ?? 1);
      },
      setStrokeData: (data: StrokeData) => {
        const node = nativeRef.current;
        if (node) Commands.setStrokeData(node, JSON.stringify(data));
      },
      isEmpty: () =>
        send<boolean>(
          'isEmpty',
          (id) => Commands.isEmpty(nativeRef.current!, id),
          (raw) => raw === 'true'
        ),
      toBase64: (options?: ExportImageOptions) =>
        send<string>('toBase64', (id) =>
          Commands.toBase64(
            nativeRef.current!,
            id,
            options?.format ?? 'png',
            options?.quality ?? 1,
            options?.trim ?? false
          )
        ),
      toFile: (options?: ExportImageOptions) =>
        send<string>('toFile', (id) =>
          Commands.toFile(
            nativeRef.current!,
            id,
            options?.format ?? 'png',
            options?.quality ?? 1,
            options?.trim ?? false
          )
        ),
      toSvg: () =>
        send<string>('toSvg', (id) => Commands.toSvg(nativeRef.current!, id)),
      getStrokeData: () =>
        send<StrokeData>(
          'getStrokeData',
          (id) => Commands.getStrokeData(nativeRef.current!, id),
          (raw) => parseMaybeJson<StrokeData>(raw, [])
        ),
      saveToPhotoLibrary: (options?: ExportImageOptions) =>
        send<SavedToPhotoLibraryResult>(
          'saveToPhotoLibrary',
          (id) =>
            Commands.saveToPhotoLibrary(
              nativeRef.current!,
              id,
              options?.format ?? 'png',
              options?.quality ?? 1,
              options?.trim ?? true
            ),
          (raw) =>
            parseMaybeJson<SavedToPhotoLibraryResult>(raw, { granted: false })
        ),
    }),
    [send]
  );

  React.useImperativeHandle(ref, () => handle, [handle]);

  const handleResult = React.useCallback(
    (event: {
      nativeEvent: {
        requestId: string;
        type: string;
        value?: string;
        error?: string;
      };
    }) => {
      const { requestId, value, error } = event.nativeEvent;
      const resolver = pending.current.get(requestId);
      if (!resolver) return;
      pending.current.delete(requestId);
      if (error) {
        resolver.reject(new Error(error));
      } else {
        resolver.resolve(value);
      }
    },
    []
  );

  const handleBegin = React.useCallback(() => {
    onBegin?.();
  }, [onBegin]);
  const handleEnd = React.useCallback(() => {
    onEnd?.();
  }, [onEnd]);
  const handleChange = React.useCallback(
    (event: { nativeEvent: ChangeEvent }) => {
      onChange?.(event.nativeEvent);
    },
    [onChange]
  );
  const handleReplayProgress = React.useCallback(
    (event: { nativeEvent: { progress: number } }) => {
      onReplayProgress?.({ progress: event.nativeEvent.progress });
    },
    [onReplayProgress]
  );
  const handleToolbarAction = React.useCallback(
    (event: { nativeEvent: { itemId?: string; action?: string } }) => {
      const id = event.nativeEvent.itemId ?? event.nativeEvent.action ?? '';
      onToolbarAction?.({ id, action: id });
    },
    [onToolbarAction]
  );

  const nativeProps: NativeProps = {
    ...(rest as unknown as NativeProps),
    style,
    inkBackgroundColor: backgroundColor,
    toolbarItemsJson,
    toolbarMaxVisibleButtons: toolbarMaxVisibleButtons ?? 0,
    onBegin: handleBegin,
    onEnd: handleEnd,
    onStrokesChange: handleChange,
    onResult: handleResult,
    onReplayProgress: handleReplayProgress,
    onToolbarAction: handleToolbarAction,
  };

  return <SignatureInkNativeView ref={nativeRef} {...nativeProps} />;
});

export type { SignatureInkHandle, SignatureInkProps };

// Re-exported for advanced consumers who want to call findNodeHandle / processColor
// against the raw view without going through the wrapper.
export const _internal = { findNodeHandle, processColor };
