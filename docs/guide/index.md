---
description: "What react-native-signature-ink is: a Fabric signature component that draws with PencilKit on iOS and a velocity-Bezier renderer on Android."
---

# What is react-native-signature-ink?

`react-native-signature-ink` is a signature pad for React Native that draws with each platform's own ink engine instead of a JavaScript canvas, Skia or a WebView.

- **iOS** uses [PencilKit](https://developer.apple.com/documentation/pencilkit) (`PKCanvasView`), the engine behind the Notes app. You get pressure, Apple Pencil tilt and PencilKit's own smoothing for free.
- **Android** uses a Kotlin port of the well-known velocity-Bezier signature algorithm: strokes are smoothed with cubic Bezier curves and get thinner as the pen moves faster. Ink is drawn into an offscreen bitmap, so exports are instant.

You render one component, `<SignatureInk />`, and talk to it through a typed ref.

## Platforms and architecture {#platforms-and-architecture}

| | Support |
| --- | --- |
| iOS | Yes (Swift, PencilKit) |
| Android | Yes (Kotlin), API 24+ |
| New Architecture (Fabric) | Required. The component is a codegen Fabric view. |
| Expo | Development builds and `expo prebuild`. Not Expo Go. |
| Web | No. The package is native only. |

## What you can do {#what-you-can-do}

| Feature | Where |
| --- | --- |
| Pen color, width range, background, signing baseline | [Props](/guide/props) |
| Undo, redo, clear, copy, replay, export from code | [Ref methods](/guide/methods) |
| Native toolbar with custom buttons and an overflow menu | [Toolbar](/guide/toolbar) |
| React to strokes, changes, replay progress and toolbar taps | [Events](/guide/events) |
| PNG, JPEG, SVG, clipboard, photo library | [Export formats](/guide/export) |
| Save and restore strokes, animate them again | [Stroke data and replay](/guide/stroke-data) |
| Apple Pencil only or stylus only input | [Props](/guide/props#input) |
| PencilKit tool picker and ink types (iOS) | [Props](/guide/props#ios-only) |

## How the pieces fit {#how-the-pieces-fit}

```text
<SignatureInk ref={ref} />          your props and event callbacks
        │
        ▼
SignatureInkView (Fabric codegen)   one native view, no native modules
        │
        ├─ iOS: PKCanvasView, toolbar, baseline, exports
        └─ Android: velocity-Bezier canvas, toolbar, baseline, exports
```

Ref methods such as `toBase64()` are sent to the native view as commands. Results come back through a single internal event and resolve the Promise you awaited, so nothing blocks the JS thread while you draw.

## Two components {#two-components}

- **`SignatureInk`** is the one to use. It gives you the ref API, Promise results and friendly event payloads.
- **`SignatureInkView`** is the raw codegen component underneath. It takes native prop names such as `inkBackgroundColor` and `toolbarItemsJson` and has no Promise API. Use it only if you want to drive the view yourself. See the [API reference](/api/variables/SignatureInkView).

## Next steps {#next-steps}

- [Install the library](/guide/installation)
- [Add a signature pad in five minutes](/guide/quick-start)
- [Try the props in the browser](/guide/props#try-it)

## Credits {#credits}

The Android renderer is a port of [gcacace/android-signaturepad](https://github.com/gcacace/android-signaturepad) and its successor [warting/android-signaturepad](https://github.com/warting/android-signaturepad), which use the "Smoother Signatures" approach.
