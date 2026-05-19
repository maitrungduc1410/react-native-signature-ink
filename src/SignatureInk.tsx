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
  ToolbarActionEvent,
} from './types';

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
    ...rest
  } = props;

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
    (event: { nativeEvent: { action: string } }) => {
      onToolbarAction?.({
        action: event.nativeEvent.action as ToolbarActionEvent['action'],
      });
    },
    [onToolbarAction]
  );

  const nativeProps: NativeProps = {
    ...(rest as unknown as NativeProps),
    style,
    inkBackgroundColor: backgroundColor,
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
