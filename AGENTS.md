# AGENTS.md

Operational guide for AI coding agents (and new contributors) working on this repo.

**Read in this order:**

1. This file — operational quick-reference.
2. [`LESSONS_LEARNED.md`](LESSONS_LEARNED.md) — the narrative behind every gotcha listed below. Several bugs in this repo were "fixed" three or four times before we understood the actual rule; that file is the difference between you re-fixing them again or not. **Read it before you touch view recycling, the tool picker, Android layout, or unit conversion.**
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the library is structured end-to-end.
4. [`README.md`](README.md) — public docs.
5. [`CONTRIBUTING.md`](CONTRIBUTING.md) — workflow conventions.

## Project overview

`react-native-signature-ink` is a fully native React Native signature library. iOS is Swift on top of `PKCanvasView` (PencilKit); Android is Kotlin running a hand-tuned velocity-Bezier ink algorithm into an offscreen `Bitmap`. The JS surface is a Fabric codegen component plus one ergonomic wrapper with a Promise-based imperative API. No Skia, no Reanimated, no WebView, no native modules — view-only library.

The repo is a Yarn monorepo: the library lives at the root, the demo app at `example/`.

## Setup

```sh
# Install workspace deps (root)
yarn

# Run the example app
yarn example ios          # builds + runs on the iOS simulator
yarn example android      # builds + runs on a device/emulator
yarn example start        # Metro only

# Static checks
yarn typecheck            # tsc against the workspace
yarn lint                 # eslint
```

Native changes require a full rebuild (`yarn example ios|android`). JS-only changes hot-reload through Metro.

The example app's Metro config uses `react-native-monorepo-config`. If you bump dependencies and `metro.config.js` starts failing, double-check the example's `package.json` resolutions block — Metro is the most fragile piece of the workspace setup.

## Code style

### TypeScript

- Strict mode. JSDoc on every public type, prop, and method. Defaults documented inline.
- Two entry shapes: the high-level wrapper (`SignatureInk`, in [`src/SignatureInk.tsx`](src/SignatureInk.tsx)) is the recommended surface; the raw codegen component (`SignatureInkView`, in [`src/SignatureInkViewNativeComponent.ts`](src/SignatureInkViewNativeComponent.ts)) is the escape hatch.
- The codegen file is the **single source of truth** for native props, commands, and event payload shapes. Both platforms generate their Fabric glue from it.

### Swift (iOS)

- Every prop the Obj-C++ host reads must be declared `@objc public var` in [`ios/SignatureInkSurface.swift`](ios/SignatureInkSurface.swift). Use `didSet` to fan out side effects (rebuild toolbar, sync tool picker, etc.).
- **Every** `@objc public var` MUST be reset to its declared default inside `prepareForReuse`. The list of resets must stay in sync with the list of declarations — see the "View recycling" gotcha below.
- Keep PencilKit types out of the Obj-C++ wrapper ([`ios/SignatureInkView.mm`](ios/SignatureInkView.mm)) — PencilKit isn't imported there. The split between the Obj-C++ wrapper and the Swift surface exists precisely for this reason.

### Kotlin (Android)

- All user-facing dimensions (pen widths, baseline width, `baselineOffsetFromBottom`, toolbar height / spacing) are stored in **dp** internally and converted to raw pixels at every draw site via the `dpToPx` helper. This is non-negotiable — see the "Pen widths" gotcha below.
- Layout for the `SignatureInkView` parent is performed **synchronously** in setters via `applyChildLayout()`. Do not add a setter that mutates layout state without calling it.
- The renderer view ([`SignatureCanvasView.kt`](android/src/main/java/com/signatureink/SignatureCanvasView.kt)) draws into an offscreen `inkBitmap`. Every export (PNG / JPEG / SVG / clipboard / photo library) reads from that bitmap, so exports are instant.

### Comments

- Block size: **≤ ~10 lines** unless the rationale is genuinely irreducible.
- Capture **why** the code is the way it is — what breaks if you change it, what's load-bearing, what's non-obvious. Don't restate what the code does.
- Lean on the JSDoc in [`src/types.ts`](src/types.ts) / [`src/SignatureInkViewNativeComponent.ts`](src/SignatureInkViewNativeComponent.ts); don't duplicate.

## Architecture pointers

| Concern | File |
| --- | --- |
| Public JS API + Promise plumbing | [`src/SignatureInk.tsx`](src/SignatureInk.tsx) |
| Public types | [`src/types.ts`](src/types.ts) |
| Codegen spec (source of truth) | [`src/SignatureInkViewNativeComponent.ts`](src/SignatureInkViewNativeComponent.ts) |
| iOS Fabric host | [`ios/SignatureInkView.mm`](ios/SignatureInkView.mm) |
| iOS rendering surface | [`ios/SignatureInkSurface.swift`](ios/SignatureInkSurface.swift) |
| Android Fabric host + layout | [`android/src/main/java/com/signatureink/SignatureInkView.kt`](android/src/main/java/com/signatureink/SignatureInkView.kt) |
| Android renderer | [`android/src/main/java/com/signatureink/SignatureCanvasView.kt`](android/src/main/java/com/signatureink/SignatureCanvasView.kt) |
| Android view manager (prop/command dispatch) | [`android/src/main/java/com/signatureink/SignatureInkViewManager.kt`](android/src/main/java/com/signatureink/SignatureInkViewManager.kt) |
| Android ink algorithm | [`android/src/main/java/com/signatureink/ink/`](android/src/main/java/com/signatureink/ink/) |
| Example app screens | [`example/src/screens/`](example/src/screens/) |

## Known gotchas (DO NOT re-learn these)

Each gotcha below is the operational TL;DR. For the full story — symptoms, what we tried that didn't work, the underlying mechanism, and the meta-lesson — see the matching section in [`LESSONS_LEARNED.md`](LESSONS_LEARNED.md).

### View recycling on iOS — every prop must be reset

Fabric pools `SignatureInkView` instances and may hand the same Obj-C++ object to a different React node on a later mount. The host wrapper ([`ios/SignatureInkView.mm`](ios/SignatureInkView.mm)) resets `_props` to the codegen defaults in `prepareForRecycle`, so the next mount's `updateProps(newProps, oldProps)` diff lands against `oldProps == defaults`. Fabric **skips any setter where `newProps[k] == oldProps[k]`** — meaning any prop whose new value matches the codegen default will never be forwarded to the Swift surface.

If we don't also scrub the Swift-side state, the previous mount's value sticks. Symptom: "open Toolbar & Gaps with `toolbarPosition=top`, navigate back, open Showcase, toolbar is still on top." Same pattern caused similar bugs with `showToolPicker`, `pencilOnly`, `penColor`, etc.

**Rule:** [`SignatureInkSurface.swift::prepareForReuse`](ios/SignatureInkSurface.swift) MUST assign every `@objc public var` back to its declared default. If you add a new `@objc public var`, add a reset line here too.

### `PKToolPicker` re-attaches on its own

`PKToolPicker.setVisible(false, …)` only schedules a fade. The picker's underlying system UI keeps re-anchoring to whichever `PKCanvasView` enters the window next until the picker object itself deallocates. The library uses a process-wide `sharedToolPicker` static plus explicit `detachToolPicker()` (which nils the static when the calling surface was the picker's owner). Don't replace this with per-instance pickers — `PKToolPicker`'s system XPC UI doesn't tolerate two side-by-side instances.

### iOS dark mode + `PKDrawing.image(from:scale:)`

PencilKit resolves dark-aware ink colors against the current trait collection at draw time. The on-screen canvas is pinned to `.light` via `overrideUserInterfaceStyle`, but `PKDrawing.image(from:scale:)` uses whatever trait collection is current when it runs — so on a dark-mode host, black ink renders near-white in the exported image. The fix in [`renderImage`](ios/SignatureInkSurface.swift) is `lightTraits.performAsCurrent { … }`; don't remove it.

### iOS canvas swap for `undo` / `redo` / `clear` / `setStrokeData`

PencilKit keeps an internal "stroke baseline" alongside the public `.drawing` property. If you reassign `.drawing` to fewer strokes, the next user touch can resurrect previously-removed strokes by appending new ink to that lingering baseline. The fix is `resetCanvasWithDrawing`, which tears down and rebuilds the `PKCanvasView`. Replay is exempt because it only grows the drawing.

### Android layout — Fabric swallows `requestLayout()`

React Native (Fabric) on Android swallows `requestLayout()` calls bubbling up from native descendants of a Fabric-managed parent. Posted `View.measure/layout` passes are also unreliable (cached specs, cleared flags). [`SignatureInkView.kt`](android/src/main/java/com/signatureink/SignatureInkView.kt) bypasses this by calling `applyChildLayout()` synchronously from every prop setter that affects layout — which measures and positions the canvas + toolbar children directly. Initial mount still goes through Yoga via the standard `onMeasure` / `onLayout` overrides.

If you add a prop that affects layout, you MUST call `applyChildLayout()` from its setter.

### Android pen widths must be dp internally

The renderer ([`SignatureCanvasView.kt`](android/src/main/java/com/signatureink/SignatureCanvasView.kt)) stores `penMinWidth` and `penMaxWidth` (and the per-stroke `minWidth` / `maxWidth` captured on each `Stroke`) in **dp**, matching the JS prop and iOS points. Android draw APIs (`Paint.strokeWidth`, `Canvas.drawCircle(radius)`, SVG `stroke-width`, `bezier.draw`) want raw pixels — every site converts through `dpToPx` at the point of use.

Storing in dp keeps:

- Stroke-data round-trips (`getStrokeData` → `setStrokeData`) density-independent.
- `penMaxWidth={3}` rendering the same physical thickness on 1×/2×/3× devices.
- Visual parity with the iOS side.

If you add a new draw call that consumes a pen width, convert with `dpToPx`.

### Android baseline anchor

When the toolbar is visible, the baseline tracks the toolbar edge — top or bottom, whichever the toolbar uses — so the symmetric gap above/below the icons stays consistent and the baseline doesn't jump when the toolbar toggles. Driven by the `BaselineAnchor` enum and `syncBaselineAnchor()` in [`SignatureInkView.kt`](android/src/main/java/com/signatureink/SignatureInkView.kt). When the toolbar is hidden, the explicit `baselineOffsetFromBottom` prop is used instead.

### Android `topChange` is taken

React Native's core registers `topChange` as a bubbling event for `TextInput` / `Switch`. Our `onChange` payload would clobber the typing. We emit under `topStrokesChange` (codegen-derived from `onStrokesChange`). Don't rename it back.

### Android clipboard — `FileProvider` required

Sharing a `file://` URI cross-process on API 24+ throws `FileUriExposedException`. Clipboard copy writes the PNG to the app cache and shares a `content://` URI via the library's bundled `FileProvider` (`AndroidManifest.xml` + `res/xml/signature_ink_file_paths.xml`). Don't change to `file://`.

### Android `FileProvider` — declare our own subclass, never the AndroidX class

The manifest merger keys `<provider>` nodes by `android:name`. Declaring `androidx.core.content.FileProvider` directly makes our node the *same node* as the one from any other library — or the host app — that declares it, and the build dies on the conflicting `android:authorities` / `FILE_PROVIDER_PATHS` values ([#2](https://github.com/maitrungduc1410/react-native-signature-ink/issues/2)). We ship [`SignatureInkFileProvider`](android/src/main/java/com/signatureink/SignatureInkFileProvider.kt) purely to own a unique merge key.

Two things to keep in mind if you touch this:

- Keep the `<meta-data android:name="android.support.FILE_PROVIDER_PATHS">` child. The `FileProvider(@XmlRes int)` constructor looks like it replaces it, but the **static** `getUriForFile(context, authority, file)` we call passes `ID_NULL` and re-reads the paths XML from `PackageManager` — dropping the meta-data throws `Missing android.support.FILE_PROVIDER_PATHS meta-data` at runtime.
- The same "unique name" rule applies to the paths resource: ours is `res/xml/signature_ink_file_paths.xml`, not `file_paths.xml`, because the resource merger silently lets the last `@xml/file_paths` win.

### iOS Info.plist for `saveToPhotoLibrary`

Host apps that call `saveToPhotoLibrary` MUST declare `NSPhotoLibraryAddUsageDescription` in their `Info.plist`. iOS will crash the process otherwise. We document this in the README and the JSDoc on `SignatureInkHandle.saveToPhotoLibrary`. Don't drop the warning.

### Photo library export must be opaque

The iOS Photos viewer renders transparent PNGs against its own black chrome — light-themed canvases look inverted in the library. `saveToPhotoLibrary` always renders `opaque: true` (compositing onto `inkBackgroundColor` or white) so the saved asset matches what the user drew.

### Recurring bugs are a smell

If a bug you're about to fix has been fixed before under a different prop name / sibling view / code path, **stop**. Your "fix" is almost certainly partial. Find the actual rule, audit every site that obeys it, and add a `KEEP IN SYNC` comment so the next change doesn't drift. See [`LESSONS_LEARNED.md` §11](LESSONS_LEARNED.md#11-recurring-bugs-are-a-smell) for the bug-fix-then-it-came-back history that produced this rule.

## PRs / commits

- Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`). `commitlint` runs in lefthook's pre-commit hook.
- Run `yarn typecheck` and `yarn lint` before pushing.
- Native changes require an example-app rebuild.
- Prefer small PRs over large ones. The repo has zero CI test coverage today; the example app is the manual verification surface.
