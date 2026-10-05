---
description: "Every SignatureInk prop with its per-platform default: pen color and width, background, baseline, stylus-only input and iOS PencilKit options."
---

# Props

All props are optional. Sizes, widths and offsets are density-independent: points on iOS, dp on Android. The same number gives the same physical size on every screen and on both platforms.

## Try it {#try-it}

Draw on the pad and change the props. The ink uses a JavaScript port of the Android renderer, so it is close to what you get on an Android device; PencilKit on iOS looks slightly different (see [iOS vs Android](/guide/platform-differences)). The matching JSX is at the bottom.

<SignaturePad />

## Layout {#layout}

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `style` | `StyleProp<ViewStyle>` | | The view has no intrinsic size. Set a `height` or `flex`. |

## Pen {#pen}

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `penColor` | `ColorValue` | iOS: black, Android: `#111111` | Applies to new strokes. Existing strokes keep their color. |
| `penMinWidth` | `number` | `1` | Thinnest line, reached when the pen moves fast. |
| `penMaxWidth` | `number` | `3` | Thickest line, used when the pen moves slowly. |
| `velocityFilterWeight` | `number` | `0.7` | Android only. Clamped to 0 to 1. |

How the width range is used depends on the platform:

- **Android** computes the width of each curve segment as `max(penMaxWidth / (velocity + 1), penMinWidth)`, with the velocity in dp per millisecond. `velocityFilterWeight` is the weight of the newest velocity sample in an exponential filter: higher values react faster, lower values give smoother, slower tapering.
- **iOS** hands PencilKit a single tool width, the midpoint of the two values (`2` with the defaults), and PencilKit varies the line itself based on pressure and speed. `velocityFilterWeight` is ignored.

On iOS the ink color is used exactly as given. Dark mode does not invert it, on screen or in exports, so pass concrete colors such as `'#111'` or `'white'`, not adaptive system colors.

## Canvas {#canvas}

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `backgroundColor` | `ColorValue` | `transparent` | Canvas fill. With the default, your parent view shows through. |

`backgroundColor` is a prop, not a style key, because it also affects exports: JPEG and photo library images are composited on it (or on white when it is transparent), and on Android PNG exports include it too. See [Export formats](/guide/export#backgrounds).

## Baseline {#baseline}

The signing line is drawn 16 units in from the left and right edges. It is never part of exported images.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `showBaseline` | `boolean` | `false` | |
| `baselineColor` | `ColorValue` | 50% gray | iOS: `systemGray` at 50% opacity. Android: `#80808080`. |
| `baselineStyle` | `'solid' \| 'dashed' \| 'dotted'` | `'dashed'` | Unknown values fall back to `'dashed'`. |
| `baselineWidth` | `number` | `0` | `0` means automatic: `1` for solid and dashed, a little thicker for dotted (iOS `1.5`, Android `2`). |
| `baselineOffsetFromBottom` | `number` | iOS: `8`, Android: `16` | Distance from the bottom of the drawing area. Ignored while the toolbar is shown. |

When the [toolbar](/guide/toolbar) is visible, the baseline sits on the edge between the drawing area and the toolbar, so the gap around the icons stays even and the line does not jump when you move the toolbar to the top.

## Input {#input}

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `pencilOnly` | `boolean` | `false` | Accept stylus input only. |

- **iOS** sets `PKCanvasViewDrawingPolicy.pencilOnly`: only Apple Pencil draws and finger touches are ignored. The drawing policy needs iOS 14 or newer.
- **Android** ignores any touch whose pointer is not `MotionEvent.TOOL_TYPE_STYLUS`. The eraser end of a stylus reports a different tool type, so it is ignored too.

## Toolbar {#toolbar}

| Prop | Type | Default |
| --- | --- | --- |
| `showToolbar` | `boolean` | `false` |
| `toolbarPosition` | `'top' \| 'bottom'` | `'bottom'` |
| `toolbarButtons` | `ToolbarItem[]` | undo, redo, clear, copy |
| `toolbarMaxVisibleButtons` | `number` | `0` (fit to width) |
| `toolbarBackgroundColor` | `ColorValue` | `transparent` |
| `toolbarTintColor` | `ColorValue` | see [Toolbar](/guide/toolbar#colors) |
| `toolbarHeight` | `number` | iOS: `44`, Android: `48` |
| `toolbarIconSpacing` | `number` | `8` |

Details, custom buttons and the overflow menu are on the [Toolbar](/guide/toolbar) page.

## iOS only {#ios-only}

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `showToolPicker` | `boolean` | `false` | Shows the system PencilKit tool picker. |
| `defaultInkType` | `InkType` | `'pen'` | Initial PencilKit ink. |

Android ignores both props.

`defaultInkType` accepts `'pen'`, `'pencil'` and `'marker'` on every iOS version. `'monoline'`, `'fountainPen'`, `'watercolor'` and `'crayon'` need iOS 17; on older versions they fall back to `'pen'`.

```tsx
<SignatureInk showToolPicker defaultInkType="fountainPen" />
```

With `showToolPicker`, the user can change the ink, color and width and switch to the eraser. The picker covers the bottom of the screen (roughly 220 pt on iPhone), so leave room for it in your layout. It is detached when the view leaves the window, so it never stays on top of the next screen. Colors picked in dark mode are kept as they look in light mode, matching how `penColor` behaves.

## Events {#events}

`onBegin`, `onEnd`, `onChange`, `onReplayProgress` and `onToolbarAction` are covered on the [Events](/guide/events) page.
