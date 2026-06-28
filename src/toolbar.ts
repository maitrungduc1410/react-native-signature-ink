// Toolbar action ids and icon names, plus ready-made presets.
//
// These constants are exported from the library so consumers reference
// them instead of typing raw strings — `ToolbarAction.Undo` instead of
// `'undo'` — which keeps ids/icons typo-proof and discoverable.

import type { ColorValue } from 'react-native';

/**
 * The ids that have built-in native behavior. Tapping a toolbar item
 * whose `id` is one of these runs the matching canvas action
 * (undo / redo / clear / copy) *and* fires `onToolbarAction`.
 */
export const ToolbarAction = {
  Undo: 'undo',
  Redo: 'redo',
  Clear: 'clear',
  Copy: 'copy',
} as const;

/** Union of the four built-in action ids (`'undo' | 'redo' | …`). */
export type ToolbarActionId =
  (typeof ToolbarAction)[keyof typeof ToolbarAction];

/**
 * Semantic icon names guaranteed to resolve on *both* platforms
 * (SF Symbols on iOS, bundled vector drawables on Android). Pass one of
 * these as a toolbar item's `icon`.
 */
export const ToolbarIcon = {
  Undo: 'undo',
  Redo: 'redo',
  Clear: 'clear',
  Copy: 'copy',
  Save: 'save',
  Share: 'share',
  Download: 'download',
  Check: 'check',
} as const;

/** Union of the curated cross-platform icon names. */
export type ToolbarIconName = (typeof ToolbarIcon)[keyof typeof ToolbarIcon];

/** Fields shared by every toolbar item. */
export interface ToolbarItemBase {
  /** Curated icon name. Optional when `text` is provided. */
  icon?: ToolbarIconName;
  /** Text label. Rendered after the icon when both are present. */
  text?: string;
  /**
   * Per-item icon/text color. Falls back to the toolbar-wide
   * `toolbarTintColor` when omitted.
   */
  tintColor?: ColorValue;
  /**
   * Accessibility label. Defaults to `text`, then to `id` when both
   * `text` and an explicit label are omitted.
   */
  accessibilityLabel?: string;
  /** Render the item dimmed and non-interactive. Defaults to `false`. */
  disabled?: boolean;
}

/**
 * A built-in item. Because the id carries built-in behavior and a
 * default icon, both `icon` and `text` are optional here.
 */
export type BuiltInToolbarItem = ToolbarItemBase & { id: ToolbarActionId };

/**
 * A custom (app-defined) item. It has no built-in behavior — tapping it
 * only fires `onToolbarAction({ id })` — so it must render *something*:
 * at least one of `icon` or `text` is required at compile time.
 */
export type CustomToolbarItem = ToolbarItemBase & { id: string } & (
    | { icon: ToolbarIconName }
    | { text: string }
  );

/**
 * A single toolbar button. Either a {@link BuiltInToolbarItem} (one of
 * the four action ids) or a {@link CustomToolbarItem} (any other id,
 * which must carry an `icon` and/or `text`).
 */
export type ToolbarItem = BuiltInToolbarItem | CustomToolbarItem;

/**
 * Default appearance for each built-in action. Spread one of these and
 * override fields to tweak a built-in button, e.g.
 * `{ ...DefaultToolbarItems.clear, text: 'Clear' }`.
 */
export const DefaultToolbarItems = {
  undo: { id: ToolbarAction.Undo, icon: ToolbarIcon.Undo },
  redo: { id: ToolbarAction.Redo, icon: ToolbarIcon.Redo },
  clear: { id: ToolbarAction.Clear, icon: ToolbarIcon.Clear },
  copy: { id: ToolbarAction.Copy, icon: ToolbarIcon.Copy },
} as const satisfies Record<ToolbarActionId, ToolbarItem>;

/** The implicit toolbar when `toolbarButtons` is omitted. */
export const DEFAULT_TOOLBAR_BUTTONS: ReadonlyArray<ToolbarItem> = [
  DefaultToolbarItems.undo,
  DefaultToolbarItems.redo,
  DefaultToolbarItems.clear,
  DefaultToolbarItems.copy,
];
