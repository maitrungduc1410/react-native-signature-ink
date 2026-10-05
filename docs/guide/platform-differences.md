---
description: "How SignatureInk differs between iOS PencilKit and the custom Android renderer: ink, defaults, undo history, exports, stroke data, toolbar and events."
---

# iOS vs Android

The JavaScript API is the same on both platforms, but the drawing engines are not. iOS hands the work to Apple's PencilKit. Android uses a custom view that draws each stroke as Bezier curves whose width follows the speed of your finger. This page collects the differences in one place.

## Rendering {#rendering}

| | iOS | Android |
| --- | --- | --- |
| Engine | `PKCanvasView` from PencilKit | Custom `View` drawing into an offscreen bitmap |
| Line width | PencilKit's own pressure and speed response. The tool width is the midpoint of `penMinWidth` and `penMaxWidth`. | `max(penMaxWidth / (velocity + 1), penMinWidth)`, velocity in dp per ms. Slow is thick, fast is thin. |
| `velocityFilterWeight` | Ignored | Smooths the velocity between samples (default `0.7`) |
| `defaultInkType` | `pen`, `marker`, `pencil`; `monoline`, `fountainPen`, `watercolor`, `crayon` on iOS 17+ (falls back to `pen` earlier) | Ignored |
| Stylus | Apple Pencil pressure and tilt affect the ink | Treated like a finger, except for `pencilOnly` |

### Why Android has its own renderer {#why-android}

Android has no system ink engine comparable to PencilKit. The Android view is a native port of the well-known velocity-based approach used by signature pads: each new touch sample adds a cubic Bezier segment built from the last four points, and the width changes gradually from the start to the end of each segment. Strokes are drawn into a bitmap, so a finished stroke costs nothing to redraw while you keep writing.

You can try a JavaScript version of the same algorithm on the [Props](/guide/props#try-it) page.

## Defaults {#defaults}

| Prop | iOS | Android |
| --- | --- | --- |
| `penColor` | `black` | `#111111` |
| `toolbarHeight` | `44` | `48` |
| `toolbarTintColor` | The view's tint color (system blue) | Each icon's own color. See [Toolbar colors](/guide/toolbar#colors). |
| `baselineColor` | System gray at 50% opacity | `#80808080` |
| `baselineOffsetFromBottom` | `8` | `16` |
| `baselineWidth` with `baselineStyle="dotted"` | `1.5` | `2` |

Set these props explicitly if you want both platforms to look the same.

## History {#history}

| | iOS | Android |
| --- | --- | --- |
| What `undo()` reverts | The last stroke, `clear()` or `setStrokeData()` | The last stroke |
| `clear()` | Can be undone | Cannot be undone; also empties the redo stack |
| `setStrokeData()` | Can be undone | The previous drawing is gone; `undo()` removes the restored strokes one by one |
| New stroke | Empties the redo stack | Empties the redo stack |

## Exports {#exports}

| | iOS | Android |
| --- | --- | --- |
| PNG background | Always transparent | `backgroundColor` if set |
| `saveToPhotoLibrary` PNG | Opaque, white if no `backgroundColor` | `backgroundColor` if set, otherwise transparent |
| Clipboard | Transparent trimmed PNG via `UIPasteboard` | Trimmed PNG with background via a `FileProvider` URI |
| `trim` margin | 2 pt | 0.6 × `penMaxWidth` dp + 2 px |
| SVG units and widths | Points, average width per stroke | Physical pixels, `(penMinWidth + penMaxWidth) / 2` |
| `toFile` location | Temporary directory | Cache directory |
| `saveToPhotoLibrary` result | `{ granted }`; `granted: false` when access is denied | `{ granted, uri }`; `granted: false` when the write fails |

Details are on [Export formats](/guide/export).

## Stroke data {#stroke-data}

| | iOS | Android |
| --- | --- | --- |
| Coordinates | Points | dp |
| `t` | Seconds since the stroke started | Milliseconds of system uptime |
| Extra fields | `pressure`, `size`, `azimuth`, `altitude` | None |
| Restored width | Per-point `size` | Current `penMinWidth` and `penMaxWidth` |

See [Stroke data and replay](/guide/stroke-data).

## Input {#input}

| | iOS | Android |
| --- | --- | --- |
| `pencilOnly` | PencilKit `drawingPolicy` (iOS 14+). Fingers are ignored. | Only `TOOL_TYPE_STYLUS` draws. Fingers and the stylus eraser end are ignored. |
| Inside a `ScrollView` | No extra handling | The view asks its parents not to intercept the touch once a stroke starts |
| Pressure | Used by PencilKit | Not used; width comes from speed only |
| `showToolPicker` | Shows the PencilKit tool picker | Ignored |

## Toolbar {#toolbar}

| | iOS | Android |
| --- | --- | --- |
| Icons | SF Symbols | Bundled vector drawables in the same style |
| Overflow menu | Native menu with icons (iOS 14+), action sheet on older versions | `PopupMenu` with labels only |

## Events {#events}

| | iOS | Android |
| --- | --- | --- |
| `onChange` per stroke | Can fire more than once | Once |
| `onChange` vs `onEnd` order | `onEnd` first | `onChange` first |
| Render error message | `Failed to encode image` | `Failed to render bitmap` |
