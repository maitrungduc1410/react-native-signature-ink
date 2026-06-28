import * as React from 'react';
import {
  codegenNativeComponent,
  codegenNativeCommands,
  type ColorValue,
  type HostComponent,
  type ViewProps,
} from 'react-native';
import type {
  DirectEventHandler,
  Float,
  Int32,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypesNamespace';

// ─── Event payloads ───────────────────────────────────────────────────

/** Payload for `onStrokesChange`. */
interface ChangePayload {
  isEmpty: boolean;
  strokeCount: Int32;
}

/**
 * Payload for the generic `onResult` event used as the back-channel for
 * every Promise-based command (`isEmpty`, `toBase64`, `toFile`, `toSvg`,
 * `getStrokeData`, `saveToPhotoLibrary`). The JS wrapper matches
 * `requestId` to a pending Promise and resolves/rejects with `value`/`error`.
 */
interface ResultPayload {
  requestId: string;
  type: string;
  value?: string;
  error?: string;
}

/** Payload for `onReplayProgress` (0..1). */
interface ReplayProgressPayload {
  progress: Float;
}

/** Payload for `onToolbarAction`. */
interface ToolbarActionPayload {
  /**
   * The tapped item's id. Named `itemId` on the wire (not `id`) to avoid
   * clashing with the Objective-C `id` keyword in the generated C++.
   */
  itemId: string;
  /** @deprecated Alias of `itemId`, kept for one release. */
  action: string;
}

// ─── Native props (Fabric codegen source-of-truth) ────────────────────

export interface NativeProps extends ViewProps {
  // ── Pen ────────────────────────────────────────────────────────────

  /** Ink color (captured literally on iOS; PencilKit auto-inversion is disabled). */
  penColor?: ColorValue;
  /**
   * Minimum stroke width at the fastest pen velocity, in
   * density-independent units (points on iOS, dp on Android). A given
   * value renders at the same physical thickness on both platforms and
   * across all screen densities. Default: `1`.
   */
  penMinWidth?: Float;
  /**
   * Maximum stroke width at the slowest pen velocity, in the same
   * density-independent units as `penMinWidth`. Default: `3`.
   */
  penMaxWidth?: Float;
  /** Android only — velocity smoother weight (0..1). Ignored on iOS. */
  velocityFilterWeight?: Float;

  // ── Canvas / theming ───────────────────────────────────────────────

  /**
   * Canvas background color. Named `inkBackgroundColor` natively so it
   * doesn't collide with the host `backgroundColor` Fabric style prop;
   * the high-level wrapper re-maps the public `backgroundColor` prop
   * onto this name.
   */
  inkBackgroundColor?: ColorValue;

  // ── Baseline ───────────────────────────────────────────────────────

  /** Show the signing baseline. */
  showBaseline?: WithDefault<boolean, false>;
  /** Baseline color. */
  baselineColor?: ColorValue;
  /**
   * Distance in points/dp from the baseline to the canvas bottom. Only
   * used when the built-in toolbar is hidden; otherwise the baseline
   * auto-anchors to the toolbar's top edge for symmetric icon gaps.
   */
  baselineOffsetFromBottom?: Float;
  /**
   * Baseline line style: `'solid'`, `'dashed'` (default), or
   * `'dotted'`. Unrecognised values fall back to `'dashed'`.
   */
  baselineStyle?: WithDefault<string, 'dashed'>;
  /**
   * Baseline stroke width in points/dp. `0` (the default) means
   * "use the per-style auto value"; any positive value overrides it.
   */
  baselineWidth?: Float;

  // ── Input policy ───────────────────────────────────────────────────

  /**
   * iOS: only Apple Pencil input is accepted.
   * Android: only `TOOL_TYPE_STYLUS` events are accepted.
   */
  pencilOnly?: WithDefault<boolean, false>;

  // ── Toolbar ────────────────────────────────────────────────────────

  /** Render the built-in native toolbar. */
  showToolbar?: WithDefault<boolean, false>;
  /** `'top'` | `'bottom'` */
  toolbarPosition?: WithDefault<string, 'bottom'>;
  /**
   * JSON-serialized array of toolbar item objects (the high-level
   * wrapper maps the public `toolbarButtons` prop onto this). Each entry
   * is `{ id, icon?, text?, tintColor?, accessibilityLabel, disabled }`,
   * where `tintColor` is a processed color int. An empty string means
   * "use the default undo/redo/clear/copy toolbar".
   */
  toolbarItemsJson?: WithDefault<string, ''>;
  /**
   * Hard cap on inline buttons; extras collapse into an overflow menu.
   * `0` means "compute from available width at layout time".
   */
  toolbarMaxVisibleButtons?: WithDefault<Int32, 0>;
  /** Toolbar background fill. */
  toolbarBackgroundColor?: ColorValue;
  /** Toolbar icon tint (SF Symbols on iOS, vector drawables on Android). */
  toolbarTintColor?: ColorValue;
  /**
   * Toolbar height in points/dp. With auto-anchored baseline, the
   * symmetric vertical gap above/below the icons equals
   * `(toolbarHeight - iconVisualHeight) / 2`.
   */
  toolbarHeight?: Float;
  /** Horizontal gap in points/dp between adjacent toolbar buttons. */
  toolbarIconSpacing?: Float;

  // ── iOS-only ───────────────────────────────────────────────────────

  /** Attach PencilKit's system tool picker (iOS only). */
  showToolPicker?: WithDefault<boolean, false>;
  /** Initial PencilKit ink type (iOS only). */
  defaultInkType?: WithDefault<string, 'pen'>;

  // ── Events ─────────────────────────────────────────────────────────

  /** Stroke begin. */
  onBegin?: DirectEventHandler<null>;
  /** Stroke end. */
  onEnd?: DirectEventHandler<null>;
  /**
   * Drawing content changed (new stroke, undo/redo, clear, setStrokeData).
   *
   * Named `onStrokesChange` (not `onChange`) because React Native's core
   * already registers `topChange` as a bubbling event for `TextInput` /
   * `Switch`, which would clobber our payload typing.
   */
  onStrokesChange?: DirectEventHandler<ChangePayload>;
  /**
   * Generic back-channel for Promise-based commands. The JS wrapper
   * matches `requestId` to a pending Promise.
   */
  onResult?: DirectEventHandler<ResultPayload>;
  /** Fires every frame while `replay()` is running. */
  onReplayProgress?: DirectEventHandler<ReplayProgressPayload>;
  /** Fires after a built-in toolbar button is tapped. */
  onToolbarAction?: DirectEventHandler<ToolbarActionPayload>;
}

// ─── Native commands (Fabric codegen source-of-truth) ─────────────────

interface NativeCommands {
  /** Clear all strokes. Reversible via `undo`. */
  clear: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  /** Pop one stroke off the undo stack. */
  undo: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  /** Re-apply the most recently undone stroke. */
  redo: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  /** Copy a PNG of the signature to the system clipboard. */
  copyToClipboard: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>
  ) => void;
  /** Resolve via `onResult` with `"true"`/`"false"`. */
  isEmpty: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    requestId: string
  ) => void;
  /** Resolve via `onResult` with a base64 string (no `data:` prefix). */
  toBase64: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    requestId: string,
    format: string,
    quality: Float,
    trim: boolean
  ) => void;
  /** Resolve via `onResult` with a `file://` URI of the written image. */
  toFile: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    requestId: string,
    format: string,
    quality: Float,
    trim: boolean
  ) => void;
  /** Resolve via `onResult` with an SVG document string. */
  toSvg: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    requestId: string
  ) => void;
  /** Resolve via `onResult` with a JSON-serialized `StrokeData`. */
  getStrokeData: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    requestId: string
  ) => void;
  /** Replace the canvas contents with the given JSON-serialized `StrokeData`. */
  setStrokeData: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    json: string
  ) => void;
  /** Animate the current strokes; `speed` multiplies the natural pace. */
  replay: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    speed: Float
  ) => void;
  /**
   * Save the rendered signature to the OS photo library.
   * Resolves via `onResult` with a JSON `{ granted, uri? }` blob.
   */
  saveToPhotoLibrary: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    requestId: string,
    format: string,
    quality: Float,
    trim: boolean
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: [
    'clear',
    'undo',
    'redo',
    'copyToClipboard',
    'isEmpty',
    'toBase64',
    'toFile',
    'toSvg',
    'getStrokeData',
    'setStrokeData',
    'replay',
    'saveToPhotoLibrary',
  ],
});

export default codegenNativeComponent<NativeProps>(
  'SignatureInkView'
) as HostComponent<NativeProps>;
