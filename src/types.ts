import type { ColorValue } from 'react-native';
import type { ToolbarItem } from './toolbar';

/**
 * Image format used by all raster export commands (`toBase64`, `toFile`,
 * `saveToPhotoLibrary`).
 *
 * - `png` produces a lossless image with full alpha (transparent background).
 * - `jpeg` produces a smaller lossy image. JPEG has no alpha so the canvas
 *   `backgroundColor` (or white if transparent) is composited beneath the
 *   ink before encoding.
 */
export type ExportFormat = 'png' | 'jpeg';

/**
 * Where the built-in toolbar attaches inside the signature view.
 */
export type ToolbarPosition = 'top' | 'bottom';

/**
 * Line rendering style for the signing baseline.
 *
 * - `'solid'`  — continuous 1pt line.
 * - `'dashed'` — alternating dash + gap segments (default).
 * - `'dotted'` — evenly spaced round dots.
 */
export type BaselineStyle = 'solid' | 'dashed' | 'dotted';

/**
 * PencilKit ink type used as the initial `canvasView.tool` on iOS.
 * Availability depends on the iOS version:
 *
 * - iOS 13+:   `pen`, `pencil`, `marker`
 * - iOS 14+:   adds `monoline`, `fountainPen`, `watercolor`, `crayon`
 *
 * Android always renders a single velocity-Bezier pen and ignores this.
 */
export type InkType =
  | 'pen'
  | 'pencil'
  | 'marker'
  | 'monoline'
  | 'fountainPen'
  | 'watercolor'
  | 'crayon';

/**
 * A single captured input sample within a stroke.
 *
 * Coordinates are in the view's local coordinate space (CSS pixels / dp).
 * The exact set of fields varies between platforms:
 *
 * - All platforms set `x`, `y`, `t`.
 * - iOS additionally fills `pressure`, `azimuth`, `altitude` and `size`
 *   from PencilKit. Android leaves these `undefined`.
 *
 * Unknown fields are ignored on `setStrokeData`, so payloads round-trip
 * cleanly across platforms.
 */
export interface StrokePoint {
  /** X coordinate in the view's coordinate space. */
  x: number;
  /** Y coordinate in the view's coordinate space. */
  y: number;
  /**
   * Timestamp: on iOS this is the PencilKit `timeOffset` (seconds since
   * stroke creation). On Android this is the absolute `MotionEvent.eventTime`
   * (millisecond uptime). Only the relative deltas matter for replay.
   */
  t: number;
  /** iOS only. Force at this sample, in PencilKit's normalized 0..1 range. */
  pressure?: number;
  /** iOS only. Pencil azimuth in radians. */
  azimuth?: number;
  /** iOS only. Pencil altitude angle in radians. */
  altitude?: number;
  /**
   * iOS only. Per-point stroke width in points; preserved so restored
   * strokes render at the same thickness as the originals.
   */
  size?: number;
}

/**
 * A captured drawing as an ordered list of strokes; each stroke is an
 * ordered list of {@link StrokePoint}. Empty drawings serialize as `[]`.
 */
export type StrokeData = StrokePoint[][];

/**
 * Payload for the `onChange` callback. Fires whenever the visible
 * drawing changes (new stroke, undo/redo, clear, programmatic set).
 */
export interface ChangeEvent {
  /** `true` while there are zero strokes on the canvas. */
  isEmpty: boolean;
  /** Total number of strokes currently on the canvas. */
  strokeCount: number;
}

/**
 * Payload for the `onReplayProgress` callback emitted during `replay()`.
 */
export interface ReplayProgressEvent {
  /** Linear 0..1 progress through the configured replay duration. */
  progress: number;
}

/**
 * Payload for the `onToolbarAction` callback that fires whenever the
 * user taps a toolbar button. For built-in items (`undo` / `redo` /
 * `clear` / `copy`) the native action has already been applied to the
 * canvas; custom items only fire this event.
 */
export interface ToolbarActionEvent {
  /** The tapped item's `id` (built-in action id or any custom id). */
  id: string;
  /**
   * @deprecated Alias of {@link ToolbarActionEvent.id}, kept for one
   * release for backward compatibility. Use `id` instead.
   */
  action: string;
}

/**
 * Options shared by `toBase64`, `toFile`, and `saveToPhotoLibrary`.
 */
export interface ExportImageOptions {
  /** Defaults to `'png'`. */
  format?: ExportFormat;
  /**
   * 0..1 quality applied to JPEG encoding only. Ignored for PNG (always
   * lossless). Defaults to `1`.
   */
  quality?: number;
  /**
   * Crop the rendered bitmap to the strokes' bounding box (plus a 2pt
   * inset) instead of the full canvas size. Defaults to `false`.
   */
  trim?: boolean;
}

/** Options accepted by the imperative `replay()` method. */
export interface ReplayOptions {
  /**
   * Playback multiplier. `1` plays at the natural pace (≈ 4ms per control
   * point with a 0.5s minimum); `2` plays twice as fast; `0.5` plays at
   * half speed. Clamped to a minimum of 0.05.
   */
  speed?: number;
}

/**
 * Result of {@link SignatureInkHandle.saveToPhotoLibrary}.
 *
 * - `uri` is set on Android to the `content://` URI of the inserted
 *   MediaStore entry. iOS does not expose a stable URI so it is left
 *   undefined there.
 * - `granted` is `false` on iOS when the user denies the system "Add to
 *   Photos" permission prompt. On Android it is `true` whenever the
 *   insertion succeeds.
 */
export interface SavedToPhotoLibraryResult {
  granted: boolean;
  uri?: string;
}

/**
 * Props for the high-level `<SignatureInk />` wrapper. Every prop is
 * optional with sane native defaults.
 */
export interface SignatureInkProps {
  /** Standard React Native view style. Sizing/positioning live here. */
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;

  // ───── Pen ─────────────────────────────────────────────────────────

  /**
   * Ink color. On iOS this is captured *literally* (PencilKit's dark-mode
   * auto-inversion is disabled), so pass concrete colors like `#111` or
   * `'white'` — not trait-adaptive ones like `'label'`.
   * Default: black-ish.
   */
  penColor?: ColorValue;
  /**
   * Minimum stroke width at the fastest pen velocity, expressed in
   * density-independent units (points on iOS, dp on Android). The
   * physical thickness rendered for a given value is the same on both
   * platforms across all screen densities. Default: `1`.
   */
  penMinWidth?: number;
  /**
   * Maximum stroke width at the slowest pen velocity, in the same
   * density-independent units as {@link penMinWidth}. Default: `3`.
   */
  penMaxWidth?: number;
  /**
   * 0..1 weight of the most recent velocity sample in the velocity smoother
   * (Android only — PencilKit handles smoothing itself). Higher values feel
   * snappier; lower values produce smoother (laggier) tapering. Default: 0.7.
   */
  velocityFilterWeight?: number;

  // ───── Canvas / theming ────────────────────────────────────────────

  /**
   * Canvas background color. Use a dark color (e.g. `#0c0c0c`) plus a
   * light `penColor` to render the surface in a dark theme. Defaults to
   * transparent so the parent view's background shows through.
   */
  backgroundColor?: ColorValue;

  // ───── Baseline ────────────────────────────────────────────────────

  /** Show the signing baseline near the bottom of the canvas. */
  showBaseline?: boolean;
  /** Baseline color. Defaults to a translucent system gray. */
  baselineColor?: ColorValue;
  /**
   * Distance in points/dp from the baseline to the bottom of the canvas
   * drawing area. Used only when `showToolbar` is `false` — when the
   * built-in toolbar is visible the baseline auto-anchors to the toolbar's
   * top edge so the visual gap above and below the icons stays symmetric.
   */
  baselineOffsetFromBottom?: number;
  /**
   * Line style for the baseline. `'solid'` draws a continuous line;
   * `'dashed'` draws short dash segments (the default); `'dotted'`
   * draws evenly spaced round dots. Defaults to `'dashed'`.
   */
  baselineStyle?: BaselineStyle;
  /**
   * Baseline stroke width in points/dp. Pass any positive value to
   * override the per-style default; pass `0` (or omit) to use the
   * style-tuned default — `1` for `'solid'`/`'dashed'`, and a slightly
   * thicker value for `'dotted'` so the round dots stay visible.
   *
   * On Android the value is interpreted as dp (density-adjusted at
   * draw time), so `1` looks the same on every screen density.
   */
  baselineWidth?: number;

  // ───── Input policy ────────────────────────────────────────────────

  /**
   * iOS only. When `true`, the canvas accepts input *exclusively* from an
   * Apple Pencil (`PKCanvasViewDrawingPolicy.pencilOnly`); finger touches
   * are silently dropped. On Android, when `true`, only events with
   * `TOOL_TYPE_STYLUS` are accepted.
   */
  pencilOnly?: boolean;

  // ───── Toolbar ─────────────────────────────────────────────────────

  /**
   * Render the built-in native toolbar (undo / redo / clear / copy).
   * When `false`, render your own buttons that call the imperative API.
   */
  showToolbar?: boolean;
  /** Toolbar anchor edge. Defaults to `'bottom'`. */
  toolbarPosition?: ToolbarPosition;
  /**
   * The toolbar buttons, in the order they appear. Each entry is a
   * {@link ToolbarItem} object. Built-in ids (`undo` / `redo` / `clear`
   * / `copy`) carry native behavior and a default icon; any other id is
   * a custom, "headless" button that only fires `onToolbarAction` and
   * must declare an `icon` and/or `text`. Defaults to
   * {@link DEFAULT_TOOLBAR_BUTTONS}.
   *
   * @example
   * toolbarButtons={[
   *   { id: ToolbarAction.Undo },
   *   { id: ToolbarAction.Clear, text: 'Clear' },
   *   { id: 'save', icon: ToolbarIcon.Save, text: 'Save' },
   * ]}
   */
  toolbarButtons?: ReadonlyArray<ToolbarItem>;
  /**
   * Hard cap on the number of buttons rendered inline; any beyond this
   * collapse into an overflow ("…") menu. When omitted (or `0`), the
   * visible count is computed at layout time from the available width.
   */
  toolbarMaxVisibleButtons?: number;
  /** Toolbar fill color. Defaults to transparent. */
  toolbarBackgroundColor?: ColorValue;
  /**
   * Color applied to the toolbar icons (SF Symbols on iOS, vector
   * drawables on Android). Defaults to the platform's accent color.
   */
  toolbarTintColor?: ColorValue;
  /**
   * Toolbar height in points/dp. Controls the symmetric vertical gap
   * between the icons and the baseline / bottom edge (= `(toolbarHeight -
   * iconVisualHeight) / 2` on each side). Defaults to ~44 on iOS / 48 on
   * Android.
   */
  toolbarHeight?: number;
  /**
   * Horizontal gap in points/dp between adjacent toolbar buttons.
   * Defaults to ~8 on both platforms.
   */
  toolbarIconSpacing?: number;

  // ───── iOS-specific ────────────────────────────────────────────────

  /**
   * iOS only. When `true`, attaches PencilKit's system tool picker
   * (`PKToolPicker`) so the user can switch ink / color / width / eraser
   * interactively. Silently ignored on Android.
   */
  showToolPicker?: boolean;
  /** iOS only initial PencilKit ink type. Ignored on Android. */
  defaultInkType?: InkType;

  // ───── Events ──────────────────────────────────────────────────────

  /** Fires when a stroke begins (finger / pencil down). */
  onBegin?: () => void;
  /** Fires when a stroke ends (finger / pencil up). */
  onEnd?: () => void;
  /** Fires whenever the visible drawing changes. */
  onChange?: (event: ChangeEvent) => void;
  /** Fires per-frame while a `replay()` is running. */
  onReplayProgress?: (event: ReplayProgressEvent) => void;
  /** Fires after a built-in toolbar button is tapped. */
  onToolbarAction?: (event: ToolbarActionEvent) => void;
}

/**
 * Imperative API exposed via `ref`. All async methods resolve once the
 * native side has finished its work.
 */
export interface SignatureInkHandle {
  /** Clear the canvas (also clears redo stack; can be undone). */
  clear: () => void;
  /** Step one stroke back through history. No-op when the undo stack is empty. */
  undo: () => void;
  /** Re-apply the most recently undone stroke. No-op when the redo stack is empty. */
  redo: () => void;
  /**
   * Copy a PNG of the trimmed signature to the system clipboard.
   *
   * On iOS this uses `UIPasteboard.general.image`. On Android the bitmap
   * is written to the app cache and a `content://` URI (served by the
   * library's bundled `FileProvider`) is placed on the primary clip.
   */
  copyToClipboard: () => void;
  /**
   * Animate the existing strokes as if the user were drawing them again.
   * Cancellable: any new stroke (or another `replay()` call) aborts the
   * current animation.
   */
  replay: (options?: ReplayOptions) => void;
  /** Replace the canvas contents with the given stroke data. */
  setStrokeData: (data: StrokeData) => void;
  /** Resolves with `true` when there are zero strokes on the canvas. */
  isEmpty: () => Promise<boolean>;
  /**
   * Resolves with a base64-encoded image of the canvas.
   * The returned string is the raw payload (no `data:` URI prefix).
   */
  toBase64: (options?: ExportImageOptions) => Promise<string>;
  /**
   * Writes the rendered image to a file in the app's temporary directory
   * and resolves with the `file://` URI.
   */
  toFile: (options?: ExportImageOptions) => Promise<string>;
  /** Resolves with an SVG document representing the current strokes. */
  toSvg: () => Promise<string>;
  /** Resolves with a JSON-serializable copy of the strokes. */
  getStrokeData: () => Promise<StrokeData>;
  /**
   * Save the rendered signature to the OS photo library.
   *
   * - iOS prompts the user the first time for "Add Photos" permission;
   *   the host app **must** declare `NSPhotoLibraryAddUsageDescription`
   *   in its `Info.plist` or the system will crash the app.
   * - Android (API 29+) writes into `MediaStore.Images.Media.EXTERNAL_CONTENT_URI`
   *   under `Pictures/Signatures/` with no runtime permission needed.
   *   On API 28 and below, declare `WRITE_EXTERNAL_STORAGE` in the host
   *   `AndroidManifest.xml`.
   */
  saveToPhotoLibrary: (
    options?: ExportImageOptions
  ) => Promise<SavedToPhotoLibraryResult>;
}
