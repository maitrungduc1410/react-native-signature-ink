# Architecture

> How `react-native-signature-ink` is put together end-to-end. For a higher-level overview, see [`README.md`](README.md#architecture). For the bug history that shaped these decisions, see [`LESSONS_LEARNED.md`](LESSONS_LEARNED.md).

## Table of contents

- [Layering](#layering)
- [The JavaScript layer](#the-javascript-layer)
- [The iOS native side](#the-ios-native-side)
- [The Android native side](#the-android-native-side)
- [Async API plumbing](#async-api-plumbing)
- [Event channels](#event-channels)
- [Unit unification](#unit-unification)
- [View recycling](#view-recycling)
- [Codegen build pipeline](#codegen-build-pipeline)
- [Publishing](#publishing)
- [What we deliberately did not do](#what-we-deliberately-did-not-do)

## Layering

The library is a Fabric host component plus a thin imperative wrapper. There are no native modules, no NativeEventEmitters, no JS-side animation drivers — everything happens inside one Fabric view.

```
                              ┌────────────────────────────────────┐
                              │  src/SignatureInk.tsx              │
                              │  • Promise/request-id back-channel │
                              │  • Public types (./types.ts)       │
                              └────────────────┬───────────────────┘
                                               │
                              ┌────────────────▼───────────────────┐
                              │  src/SignatureInkViewNativeComponent.ts (codegen) │
                              │  Single source of truth for props, │
                              │  commands, and event payloads.     │
                              └─────────────┬──────────────────────┘
                                            │ (codegen build step)
                        ┌───────────────────┴────────────────────┐
                        ▼                                        ▼
       ┌────────────────────────────────┐          ┌─────────────────────────────────┐
       │ ios/SignatureInkView.mm        │          │ android/.../SignatureInkView.kt │
       │ Obj-C++ Fabric host:           │          │ Kotlin Fabric host:             │
       │  • prop diff → Swift setters   │          │  • setters → applyChildLayout   │
       │  • codegen commands → surface  │          │  • synchronous layout           │
       │  • Swift callbacks → emitters  │          │                                 │
       └──────────────┬─────────────────┘          └──────────────┬──────────────────┘
                      ▼                                            ▼
       ┌────────────────────────────────┐          ┌─────────────────────────────────┐
       │ ios/SignatureInkSurface.swift  │          │ android/.../SignatureCanvasView │
       │  • PKCanvasView (PencilKit)    │          │  • Velocity-Bezier algorithm    │
       │  • PKToolPicker (shared)       │          │    (port of gcacace/warting)    │
       │  • baseline CAShapeLayer       │          │  • baseline Paint + DashEffect  │
       │  • toolbar UIStackView         │          │  • toolbar LinearLayout         │
       │  • PKDrawing.image → exports   │          │  • offscreen Bitmap → exports   │
       │  • CADisplayLink → replay      │          │  • Choreographer → replay       │
       └────────────────────────────────┘          └─────────────────────────────────┘
```

The two host wrappers (`.mm` on iOS, `.kt` on Android) exist purely so the Swift / Kotlin surface code stays clean: they marshal Fabric's C++ prop types into native types, translate codegen command calls into method calls on the surface, and emit Fabric events from native callbacks. All actual drawing, state, and lifecycle logic lives in the surface classes.

## The JavaScript layer

### Codegen spec — [`src/SignatureInkViewNativeComponent.ts`](src/SignatureInkViewNativeComponent.ts)

This file is the only place where the cross-platform contract is described. It declares:

- `NativeProps` — the prop shape Fabric forwards to both platforms.
- `NativeCommands` — the imperative commands callable on a native ref.
- Direct-event payload shapes for the five event channels (`onBegin`, `onEnd`, `onStrokesChange`, `onResult`, `onReplayProgress`, `onToolbarAction`).

The React Native codegen build step parses this file at native build time and emits:

- A C++ `Props` struct and `EventEmitter` class on iOS, consumed by the Obj-C++ host.
- A Kotlin `SignatureInkViewManagerInterface` and `SignatureInkViewManagerDelegate` on Android, consumed by the view manager.
- A TypeScript declaration of the `Commands` object (`Commands.undo(ref)`, `Commands.toBase64(ref, requestId, …)`).

Adding or removing a prop / command starts here.

### Public wrapper — [`src/SignatureInk.tsx`](src/SignatureInk.tsx)

`SignatureInk` is the recommended consumer-facing component. It does two things on top of the raw codegen view:

1. **Exposes a typed imperative API via `ref`.** Methods like `toBase64`, `toFile`, `replay`, `getStrokeData`, `saveToPhotoLibrary` are surfaced as Promise-returning functions (see [Async API plumbing](#async-api-plumbing) below).
2. **Reshapes event payloads.** Native fires `onStrokesChange` (named that way to dodge the reserved RN `topChange`); the wrapper rewrites it as the public `onChange({ isEmpty, strokeCount })`. Same for `onResult` (internal Promise back-channel; never exposed) and `onToolbarAction` (string → typed `ToolbarButton` union).

### Public types — [`src/types.ts`](src/types.ts)

Hand-written, JSDoc-heavy, the source of truth for consumers' editor tooltips. The codegen spec re-documents the props in a more terse style because it has different consumers (build-time scanner vs editor IntelliSense).

### Web/non-native stub — [`src/SignatureInkView.tsx`](src/SignatureInkView.tsx)

Throws on import. The native build is selected automatically via Metro's `.native.tsx` resolution.

## The iOS native side

### Obj-C++ host — [`ios/SignatureInkView.mm`](ios/SignatureInkView.mm)

Implements `RCTViewComponentView` from React Native's Fabric runtime. Responsibilities:

- **Prop diffing.** `updateProps:oldProps:` compares each prop on the codegen-generated `SignatureInkViewProps` struct against the previous one, and forwards the change to the corresponding `@objc public var` on the Swift surface.
- **Command dispatch.** Implements `RCTSignatureInkViewViewProtocol` (codegen-emitted) by forwarding each method to the surface.
- **Event emission.** Swift surface exposes `@objc` block-typed callbacks (`onBegin`, `onResult`, …). The Obj-C++ host installs those during `initWithFrame:`, weakly captures `self`, and on each call constructs the codegen `EventEmitter` payload struct and dispatches via `emitter->onWhatever(payload)`.
- **Recycle hook.** `prepareForRecycle` resets `_props` to defaults and calls the surface's `prepareForReuse`. See [View recycling](#view-recycling).

The Obj-C++ host is split from the Swift surface because **PencilKit isn't visible in the generated `SignatureInk-Swift.h` header** (it's a Swift framework, the bridging header doesn't carry it through). Keeping the surface in pure Swift sidesteps the need to wrap every PencilKit type in `@objc`-safe shims.

### Swift surface — [`ios/SignatureInkSurface.swift`](ios/SignatureInkSurface.swift)

`SignatureInkSurface: UIView` is the single class that owns everything. Subviews:

- A `PKCanvasView` — Apple's PencilKit ink engine. Pinned to `overrideUserInterfaceStyle = .light` so user-set ink colors render literally regardless of host theme.
- An optional `UIStackView` toolbar (built by `rebuildToolbar`, rebuilt on `showToolbar` / `toolbarButtons` changes only).
- An optional `CAShapeLayer` baseline (rebuilt on `showBaseline` / style changes).
- A process-wide static `PKToolPicker` — see [View recycling](#view-recycling) for why it's shared.

Stroke capture flows entirely through PencilKit:

- `PKCanvasViewDelegate` callbacks (`canvasViewDidBeginUsingTool` / `canvasViewDidEndUsingTool` / `canvasViewDrawingDidChange`) drive `onBegin` / `onEnd` / `onStrokesChange`.
- Undo / redo / clear / `setStrokeData` use the in-memory `undoStack: [PKDrawing]` / `redoStack: [PKDrawing]` plus `resetCanvasWithDrawing(_:)` to **rebuild the canvas view** rather than reassigning `.drawing`. PencilKit keeps an internal "stroke baseline" alongside `.drawing` that resurrects deleted strokes on the next touch otherwise.

Exports go through `PKDrawing.image(from:scale:)`. Two non-obvious bits:

- **Light traits forced at render time.** PencilKit auto-inverts ink based on the current `UITraitCollection`, even when the on-screen canvas is pinned. `UITraitCollection(userInterfaceStyle: .light).performAsCurrent { … }` wraps the render call so dark-mode hosts get the same image they see on screen.
- **`saveToPhotoLibrary` always renders opaque.** The system Photos viewer composites transparent PNGs against its own black chrome; a light-themed canvas would look inverted in the library. We bake the canvas background (or white) into the saved asset.

Replay uses `CADisplayLink` + a `DisplayLinkProxy` (a separate object that weakly references the surface) so the link doesn't strong-retain the view across unmount. On each tick we slice each `PKStroke`'s `PKStrokePath` to `targetPoints = totalPoints * progress` control points and rebuild a partial `PKDrawing`.

### SVG export

PencilKit doesn't expose stroke geometry in a vector-friendly way, so SVG is built manually from `PKStroke.path` control points — same shape as the JSON `getStrokeData()` output, formatted as `<path d="M ... L ...">` per stroke.

## The Android native side

### Fabric host — [`android/.../SignatureInkView.kt`](android/src/main/java/com/signatureink/SignatureInkView.kt)

A `FrameLayout` that contains a `SignatureCanvasView` and an optional `LinearLayout` toolbar. Responsibilities:

- **Setter façade.** The view manager calls setters here (`setShowToolbar`, `setToolbarPosition`, `setToolbarButtons`, `setToolbarHeight`, …). Each setter does its job and then calls `applyChildLayout()` so the change is reflected in the very next frame. We do **not** rely on `requestLayout()` — see [View recycling](#view-recycling) and [`LESSONS_LEARNED.md`](LESSONS_LEARNED.md#android-fabric-eats-requestlayout).
- **Baseline anchor logic.** `syncBaselineAnchor()` picks one of `OFFSET_FROM_BOTTOM`, `TOP_EDGE`, `BOTTOM_EDGE` based on toolbar visibility/position so the baseline always sits flush against the toolbar edge.
- **Toolbar build.** `rebuildToolbar()` constructs `ImageButton`s from XML vector drawables (`arrow_uturn_backward`, etc. — SF-Symbol-derived for visual parity with iOS). Tint, spacing, and background are applied in place.

### View manager — [`android/.../SignatureInkViewManager.kt`](android/src/main/java/com/signatureink/SignatureInkViewManager.kt)

Standard Fabric `SimpleViewManager` + codegen interface. Two notable bits:

- Every prop setter falls back to the **codegen default** when JS passes `null` / out-of-range, so the view's behavior matches what the public JSDoc promises.
- `receiveCommand` is the primary command dispatch path; the per-command codegen overloads (`override fun toBase64(...)`) all funnel through the same helpers so there's exactly one code path per command.
- Events are dispatched via `UIManagerHelper.getEventDispatcherForReactTag(...)` plus a small `SignatureInkEvent: Event<…>` subclass that supplies the registered event name (`topBegin`, `topStrokesChange`, `topResult`, …).

### Renderer — [`android/.../SignatureCanvasView.kt`](android/src/main/java/com/signatureink/SignatureCanvasView.kt)

The actual ink-drawing `View`. Strokes are kept in two places:

- `strokes: MutableList<Stroke>` — the logical model. Used by `getStrokeData()`, SVG export, replay, undo/redo, and re-rendering on size/background change.
- `inkBitmap: Bitmap` — an offscreen ARGB_8888 bitmap the same size as the view. Strokes are rasterised here as they're drawn so `onDraw` is a single `drawBitmap`, and PNG/JPEG exports just compress this bitmap directly.

#### Ink algorithm

Port of the classic [gcacace](https://github.com/gcacace/android-signaturepad) (later [warting](https://github.com/warting/android-signaturepad)) velocity-Bezier renderer. Stroke quality comes from three pieces:

- A 4-point rolling window (`activePoints`) drives a quadratic Bezier between samples `p[1]` and `p[2]`, with control points computed by [`ControlTimedPoints.calculate`](android/src/main/java/com/signatureink/ink/ControlTimedPoints.kt) (Square's "Smoother Signatures" algorithm).
- Width tapers with pen speed: `strokeWidth(velocity) = max(penMaxWidth / (velocity + 1), penMinWidth)`. A simple exponential smoother (`velocityFilterWeight`) prevents jitter.
- `Bezier.draw` subdivides each curve segment into N straight short lines (where N is the segment's chord length in pixels), updating `paint.strokeWidth` per substep so the tapering looks continuous.

There's a special case at `activePoints.size == 2`: the rolling window only renders curves once we have 4 points, so without an anchor segment the very first leading stroke would briefly disappear during replay between `take == 2` and `take == 3` (this caused a long-running replay "jump" bug — see [`LESSONS_LEARNED.md`](LESSONS_LEARNED.md#android-replay-jump-the-rolling-window-bug)).

#### Exports

- **PNG / JPEG (`toBase64`, `toFile`, `saveToPhotoLibrary`)**: render the bitmap, optionally trimmed to the strokes' bounding box plus an AA-safe inset.
- **Clipboard**: write the PNG to `context.cacheDir/signature-clipboard.png` and put a `content://` URI on the primary clipboard via the bundled `FileProvider`. `file://` URIs throw `FileUriExposedException` cross-process on API 24+.
- **SVG**: walk `strokes`, emit one `<path d="M … L …">` per stroke with `stroke-width` computed in raw pixels (`dpToPx` at the call site).
- **`saveToPhotoLibrary`**: `ContentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, …)` into `Pictures/Signatures/`. No runtime permission needed on API 29+ (scoped storage auto-grants for entries the app inserts); API ≤ 28 requires the host app to declare `WRITE_EXTERNAL_STORAGE`.

#### Replay

A `Choreographer.FrameCallback` reconstructs the partial stroke set on each frame (`progress = elapsed / duration`, take `progress * totalPoints` from `replaySnapshot`) and calls `repaintAllStrokes()`, which clears `inkBitmap` and re-rasterises the visible subset.

## Async API plumbing

The library uses **one generic Fabric event** (`onResult`) as a back-channel for every Promise-returning command instead of one event per command. Flow:

1. JS calls `await ref.current.toBase64({...})`.
2. The wrapper allocates a request id (`req-<base36>-<counter>`), stashes a `{ resolve, reject }` pair in a `Map<requestId, PendingResolver>`, then invokes `Commands.toBase64(nativeRef, requestId, format, quality, trim)`.
3. Native runs the work and fires `onResult({ requestId, type, value?, error? })`.
4. The wrapper looks up the pending entry by `requestId` and resolves / rejects with `value` / `error`.

This keeps the codegen surface narrow (one event handles N commands) and makes adding a new async command a two-line change (codegen declaration + handler in the surface).

## Event channels

| Event | Payload | Fires when |
| --- | --- | --- |
| `onBegin` | `null` | Stroke begin (touch/pencil down) |
| `onEnd` | `null` | Stroke end |
| `onStrokesChange` | `{ isEmpty, strokeCount }` | Drawing content changes |
| `onResult` | `{ requestId, type, value?, error? }` | Async command finishes (internal) |
| `onReplayProgress` | `{ progress }` | Per-frame during `replay()` |
| `onToolbarAction` | `{ action }` | Built-in toolbar button tapped |

`onStrokesChange` is named that way (not `onChange`) because React Native's core registers `topChange` as a bubbling event for `TextInput` / `Switch`. Naming our event `onChange` would clobber its payload typing on Android.

## Unit unification

User-facing dimensions cross three coordinate spaces:

- JS prop space — unitless number (`penMaxWidth={3}`).
- iOS — points (1pt = 1 logical pixel × screen scale).
- Android raw pixels — device pixels (varies 1×–3× across densities).

The contract is: **all JS prop numbers are interpreted as density-independent units** (points on iOS, dp on Android). Both platforms render the same physical thickness for a given JS value, on every device.

- iOS gets this for free: `CGFloat` props feed directly into PencilKit / `CAShapeLayer` / `UIBezierPath`, all of which work in points.
- Android needs explicit conversion. The renderer keeps **everything in dp internally** (props, per-stroke `Stroke.minWidth` / `maxWidth`, `lastWidth`) and converts to pixels at every site that hands a value to a raw-pixel API (`Paint.strokeWidth`, `Canvas.drawCircle(radius)`, `Bezier.draw`, SVG `stroke-width`, the `baselineOffsetFromBottom` subtraction, the trim-rect padding). The single conversion helper is `dpToPx(dp: Float)`.

Storing in dp also makes stroke-data round-trips density-independent — `getStrokeData()` JSON contains the same numbers on a 1× and a 3× device.

## View recycling

Fabric pools view instances. On iOS, the same `SignatureInkView` Obj-C++ object can be handed to a different React node after the original one unmounts. Anything that doesn't flow through `updateProps:` would otherwise leak across the handover.

### The default-prop diff trap

The Obj-C++ host resets `_props` to the codegen defaults in `prepareForRecycle`. Fabric's next `updateProps(newProps, oldProps)` compares against `oldProps == defaults`, and Fabric **skips any setter where `newProps[k] == oldProps[k]`**. So if the new mount uses the prop's default value, the setter is never called, and the Swift property keeps the previous mount's value.

Fix: [`SignatureInkSurface.swift::prepareForReuse`](ios/SignatureInkSurface.swift) assigns **every** `@objc public var` back to its declared default. Swift's `didSet` runs even on unchanged assignments, so this also fans out via `rebuildToolbar`, `syncToolPicker`, `applyTool`, etc. and tears down any system-level effect.

### Canvas swap on every external mutation

`PKCanvasView` keeps an internal stroke baseline that's not the same as `.drawing`. Reassigning `.drawing` to fewer strokes leaves the baseline at the old size — and the next user touch resurrects deleted strokes by drawing on top of it. Every undo / redo / clear / `setStrokeData` rebuilds the entire `PKCanvasView` via `resetCanvasWithDrawing(_:)`. Replay is exempt because every replay step strictly grows the drawing.

### Shared `PKToolPicker`

`PKToolPicker` proxies to a system XPC service. Per-instance pickers don't always surrender that XPC state on `deinit`, and two pickers visible at once are not supported. The library uses one process-wide `sharedToolPicker` static plus explicit `detachToolPicker()` (which nils the static only when the calling surface was the picker's owner) so the picker dies on the last surface that used it.

### Android

Cleaner story: the renderer's `releaseNativeResources()` is called from `ViewManager.onDropViewInstance`, freeing the offscreen bitmap and severing callback references. `onDetachedFromWindow` cancels in-flight replays so the `Choreographer.FrameCallback` lambda stops holding the view alive.

## Codegen build pipeline

`package.json` declares the codegen contract:

```json
"codegenConfig": {
  "name": "SignatureInkViewSpec",
  "type": "all",
  "jsSrcsDir": "src",
  "android": { "javaPackageName": "com.signatureink" },
  "ios": {
    "components": {
      "SignatureInkView": { "className": "SignatureInkView" }
    }
  }
}
```

At native build time:

- iOS: `pod install` triggers codegen via `react-native-codegen`, producing C++ headers under `Pods/Headers/Private/React-Codegen/react/renderer/components/SignatureInkViewSpec/`. The `.mm` host imports these to access `Props`, `EventEmitter`, and `RCTSignatureInkViewViewProtocol`.
- Android: Gradle runs `:react-native-signature-ink:generateCodegenSchemaFromJavaScript` + `generateCodegenArtifactsFromSchema`, producing Kotlin under `android/build/generated/source/codegen/java/com/facebook/react/viewmanagers/`. The view manager implements the generated `SignatureInkViewManagerInterface` and uses `SignatureInkViewManagerDelegate` for prop dispatch.

Both targets read `src/SignatureInkViewNativeComponent.ts` as the spec source. Changing a prop name / type / event payload requires a clean native build (`yarn example ios|android` after `cd example/ios && pod install` or a Gradle clean) for codegen to re-run.

## Publishing

[`react-native-builder-bob`](https://github.com/callstack/react-native-builder-bob) drives the build, configured in `package.json`:

```json
"react-native-builder-bob": {
  "source": "src",
  "output": "lib",
  "targets": [
    ["module", { "esm": true }],
    ["typescript", { "project": "tsconfig.build.json" }]
  ]
}
```

`yarn prepare` produces `lib/module/` (ESM JS) and `lib/typescript/` (`.d.ts`). The `"files"` array in `package.json` ships:

- `src/` — the spec file is needed by native codegen at consumer build time.
- `lib/` — compiled JS + types.
- `android/`, `ios/`, `*.podspec`, `react-native.config.js` — the native sides.

Native consumers re-run codegen against the bundled `src/` during their own build; that's why the source is shipped alongside the compiled output.

## What we deliberately did not do

- **No Skia.** Adds ~5MB to the binary and forces a custom rendering pipeline. Both platforms ship a first-class ink engine; using them gives free pressure / tilt / smoothing.
- **No Reanimated.** The replay animation runs on `CADisplayLink` (iOS) / `Choreographer` (Android). No JS thread involvement.
- **No Nitro Module.** The codegen surface is small enough that the regular Fabric codegen pipeline is plenty. Adding Nitro would mean a custom JSI binding for the imperative API, which we'd then duplicate per-platform.
- **No turbo / native module.** This is a view-only library. Everything happens inside the Fabric view; commands and events use the codegen-emitted interfaces.
- **No watermark / overlay rendering on the native side.** Considered briefly (see chat history). Punted to userland — host apps can absolute-position React children over the canvas if they need a visual-only overlay; burning them into exports would require either ViewShot capture or per-platform image compositing.

---

For the bug history that pushed the architecture into this shape — what we tried, what failed, and what we'd do differently — read [`LESSONS_LEARNED.md`](LESSONS_LEARNED.md).
