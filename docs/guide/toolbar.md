---
description: "Configure the native SignatureInk toolbar: built-in undo, redo, clear and copy, custom icon or text buttons, tint colors and the overflow menu."
---

# Toolbar

Set `showToolbar` to get a native button bar inside the view. By default it holds undo, redo, clear and copy.

```tsx
<SignatureInk showToolbar style={{ height: 240 }} />
```

The bar takes `toolbarHeight` from the view (44 on iOS, 48 on Android) at the top or bottom, and the drawing area shrinks to make room. Buttons are aligned to the trailing edge. If you prefer your own buttons, leave the toolbar off and call the [ref methods](/guide/methods).

## Toolbar props {#props}

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `showToolbar` | `boolean` | `false` | |
| `toolbarPosition` | `'top' \| 'bottom'` | `'bottom'` | |
| `toolbarButtons` | `ToolbarItem[]` | undo, redo, clear, copy | Order is kept. |
| `toolbarMaxVisibleButtons` | `number` | `0` | Maximum number of inline buttons. `0` fits as many as the width allows. |
| `toolbarBackgroundColor` | `ColorValue` | `transparent` | |
| `toolbarTintColor` | `ColorValue` | platform default | Color of icons and labels. See [Colors](#colors). |
| `toolbarHeight` | `number` | iOS: `44`, Android: `48` | The gap above and below the icons is `(toolbarHeight - icon height) / 2`. |
| `toolbarIconSpacing` | `number` | `8` | Horizontal gap between buttons. |

## Buttons {#buttons}

Each entry in `toolbarButtons` is an object:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | `'undo'`, `'redo'`, `'clear'` and `'copy'` run the built-in action. Any other id is a custom button. |
| `icon` | `ToolbarIconName` | One of `undo`, `redo`, `clear`, `copy`, `save`, `share`, `download`, `check`. |
| `text` | `string` | Label, shown after the icon when both are set. |
| `tintColor` | `ColorValue` | Per-button color. Falls back to `toolbarTintColor`. |
| `accessibilityLabel` | `string` | Defaults to `text`, then to `id`. |
| `disabled` | `boolean` | Dimmed to 40% and not tappable. |

Use the exported constants instead of raw strings to avoid typos:

```tsx
import {
  SignatureInk,
  ToolbarAction,
  ToolbarIcon,
  DefaultToolbarItems,
} from 'react-native-signature-ink';

<SignatureInk
  showToolbar
  toolbarTintColor="#047857"
  toolbarButtons={[
    { id: ToolbarAction.Undo },                          // default icon
    { ...DefaultToolbarItems.clear, text: 'Clear' },     // icon and label
    { id: 'save', icon: ToolbarIcon.Save, text: 'Save' }, // custom button
  ]}
  onToolbarAction={({ id }) => {
    if (id === 'save') save();
  }}
/>;
```

### Built-in buttons {#built-in-buttons}

A built-in button with neither `icon` nor `text` gets its default icon. Once you set `text`, only what you set is shown, so `{ id: 'clear', text: 'Clear' }` is a text-only button. Spread `DefaultToolbarItems.clear` (or set `icon` yourself) to keep the icon next to the label.

When a built-in button is tapped, the native action runs first, then `onToolbarAction` fires with its id.

### Custom buttons {#custom-buttons}

Any other `id` is a custom button. It has no native behavior: tapping it only fires `onToolbarAction({ id })`. TypeScript requires at least an `icon` or a `text` on custom buttons.

Ids should be unique. Two buttons with the same id cannot be told apart in `onToolbarAction`; in development the component logs a warning when it sees duplicates.

### Icons {#icons}

The icon names map to SF Symbols on iOS and to bundled vector drawables drawn after the same symbols on Android:

| `icon` | iOS SF Symbol |
| --- | --- |
| `undo` | `arrow.uturn.backward` |
| `redo` | `arrow.uturn.forward` |
| `clear` | `trash` |
| `copy` | `doc.on.doc` |
| `save` | `square.and.arrow.down` |
| `share` | `square.and.arrow.up` |
| `download` | `arrow.down.circle` |
| `check` | `checkmark` |

## Colors {#colors}

Without `toolbarTintColor` the two platforms look different:

- **iOS** uses the view's tint color (the system blue unless your app changes it).
- **Android** draws each icon in its drawable's own color: black for undo, redo, clear and copy, but **white** for save, share, download, check and the overflow button. Text labels use the theme's button text color.

So on Android, custom icons and the "…" button are invisible on a light background unless you set a tint. Set `toolbarTintColor` whenever you use custom icons or the overflow menu, and pick a light tint on dark backgrounds.

## Overflow menu {#overflow}

When the buttons do not fit, the extra ones move into a "…" menu at the end of the bar. `toolbarMaxVisibleButtons` caps the number of inline buttons even when there is room.

- Icon-only buttons take a 44-wide slot; buttons with text are measured.
- **iOS 14+** opens a native menu with the icon and label of each item; older iOS versions show an action sheet.
- **Android** opens a `PopupMenu` with labels only. It follows light and dark mode.
- Menu entries use the item's `accessibilityLabel`, which defaults to `text` and then to `id`. A bare `{ id: 'undo' }` therefore shows up as "undo" in the menu. Set `text` or `accessibilityLabel` on items that may overflow.

The overflow button's accessibility label is "More". It is not localized.

## Accessibility {#accessibility}

Icon buttons are 44×44 and text buttons are 44 high, which meets the usual touch target size. Each button exposes its `accessibilityLabel`, and `disabled` items are reported as disabled. Without `toolbarButtons`, the default buttons are labeled "Undo", "Redo", "Clear" and "Copy". When you pass your own items, labels come from `accessibilityLabel`, `text` or `id`, so give built-in items a readable label in your app's language.
