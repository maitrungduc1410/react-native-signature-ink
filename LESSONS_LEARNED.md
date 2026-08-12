# Lessons learned

> A field guide to the bugs we hit, why they happened, how we fixed them, and the generalised takeaways for anyone building a similar Fabric-first native RN library. For the operational "do this not that" checklist, see [`AGENTS.md`](AGENTS.md). For how the library actually works, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

Each section follows the same shape: **symptom → root cause → fix → generalised lesson**. The order roughly tracks when we hit each class of bug, not their importance.

## Table of contents

- [1. Fabric on iOS: every prop must be reset in `prepareForRecycle`](#1-fabric-on-ios-every-prop-must-be-reset-in-prepareforrecycle)
- [2. PencilKit: the canvas swap problem](#2-pencilkit-the-canvas-swap-problem)
- [3. PencilKit: the persistent tool picker](#3-pencilkit-the-persistent-tool-picker)
- [4. PencilKit: dark-mode color inversion on export](#4-pencilkit-dark-mode-color-inversion-on-export)
- [5. PencilKit: the photo library is not white](#5-pencilkit-the-photo-library-is-not-white)
- [6. Android Fabric eats `requestLayout()`](#6-android-fabric-eats-requestlayout)
- [7. The dp/px unit trap on Android](#7-the-dppx-unit-trap-on-android)
- [8. The baseline-jumps-when-toolbar-toggles bug](#8-the-baseline-jumps-when-toolbar-toggles-bug)
- [9. Android replay jump: the rolling-window bug](#9-android-replay-jump-the-rolling-window-bug)
- [10. Android clipboard: `FileUriExposedException`](#10-android-clipboard-fileuriexposedexception)
- [11. Recurring bugs are a smell](#11-recurring-bugs-are-a-smell)
- [12. Build-system papercuts we'd save you from](#12-build-system-papercuts-wed-save-you-from)
- [13. API design lessons](#13-api-design-lessons)
- [14. Android toolbar at runtime: stale rebuilds and lying measurements](#14-android-toolbar-at-runtime-stale-rebuilds-and-lying-measurements)
- [15. The `FileProvider` we bundled broke other people's builds](#15-the-fileprovider-we-bundled-broke-other-peoples-builds)

---

## 1. Fabric on iOS: every prop must be reset in `prepareForRecycle`

**Symptom:** Open the "Toolbar & Gaps" example with `toolbarPosition="top"`, go back to Home, open "Showcase" — the toolbar is at the top in Showcase too. Same pattern bit us with `showToolPicker` (persisted across screens), `pencilOnly` (next screen couldn't accept finger input), `penColor`, `baselineStyle`, etc. We "fixed" it three or four times before understanding the actual rule.

**Root cause:** Fabric pools `RCTViewComponentView` instances. When the original mount unmounts, Fabric hands the same Obj-C++ object to the next mount. The Obj-C++ host's `prepareForRecycle` resets `_props` to the codegen defaults so the next `updateProps(newProps, oldProps)` lands against `oldProps == defaults`. **Fabric skips any setter where `newProps[k] == oldProps[k]`** — meaning any prop whose new value matches the codegen default never reaches the Swift surface, and the Swift property keeps the *previous* mount's value.

Partial fixes that didn't work:

- Just resetting `showToolPicker`, `showToolbar`, `showBaseline`, `pencilOnly` (the "obviously dangerous" ones). The same bug kept reappearing under different prop names.
- Replacing the `PKCanvasView` on recycle. Helps with PencilKit's own state, doesn't help with Swift `var` state.
- "Defensive" extra detach calls without resetting the source prop. The next `didSet` would re-attach the picker.

**Fix:** `SignatureInkSurface.prepareForReuse` resets **every** `@objc public var` back to its declared default. Swift's `didSet` runs on every assignment (even when the value is unchanged), so this also fans the change out through the usual paths (`rebuildToolbar`, `syncToolPicker`, `applyTool`, `setNeedsLayout`, …). Adding a new prop now requires adding one line to `prepareForReuse` — a `KEEP IN SYNC` comment is parked on the function.

**Generalised lesson:** With Fabric on iOS, **the diff is against the previous prop value, not the codegen default**. Any time you store mirrored state on the native side, you must scrub it on recycle, because the next mount will only push the diff — and the diff for a default-valued prop is nothing. The safest policy is "reset everything"; trying to be clever about which props matter is how you ship the same bug N times.

## 2. PencilKit: the canvas swap problem

**Symptom:** Draw three strokes. `undo()`. Draw again. The undone stroke comes back. Same with `clear` → draw, `setStrokeData(small)` → draw, `redo` → draw.

**Root cause:** `PKCanvasView` keeps an internal "stroke baseline" alongside the public `.drawing` property. Reassigning `.drawing` to a smaller `PKDrawing` does not reset the baseline. On the next user touch, PencilKit appends new ink to whatever's in the baseline, which can include strokes you thought you'd removed.

**Fix:** Don't reassign `.drawing`. Tear down the entire `PKCanvasView` and rebuild it carrying the new `PKDrawing`. `resetCanvasWithDrawing(_:)` does this for `undo` / `redo` / `clear` / `setStrokeData`. Replay is exempt because every replay frame strictly grows the drawing (so the baseline staying in sync with `.drawing` is fine).

A subtlety: blindly tearing down the canvas in `resetCanvasWithDrawing` would also tear down the attached `PKToolPicker`, causing its system XPC UI to flicker on every undo / redo. The fix is a "soft detach" — hide the picker, unhook observers from the old canvas, then re-attach observers to the new one — without nil-ing the shared static picker.

**Generalised lesson:** PencilKit's public `.drawing` is not the full state model. When in doubt about whether a system framework has hidden state, replacing the view outright is a more reliable reset than reassigning a property. The cost (a few ms) is invisible to users; the bug class is invisible until users hit it.

## 3. PencilKit: the persistent tool picker

This was the most-revisited bug in the whole project. We "fixed" it at least four times.

**Symptom (one of many variants):** Open the Tool Picker example. Picker appears. Navigate back to Home. The picker fades on the Home screen. Open the Basics example — the picker is still there, and you can't draw because every touch hits the picker's frame.

**Root cause(s), each found one at a time:**

1. `PKToolPicker` on iOS 14+ is a Swift-level object that proxies into a system XPC service for the actual picker UI. The XPC UI keeps re-anchoring to whichever `PKCanvasView` enters the window next, until the `PKToolPicker` Swift object deallocates.
2. `picker.setVisible(false, forFirstResponder:)` only schedules a fade. It does not detach the picker from the responder chain on the XPC side.
3. Per-instance `PKToolPicker()` doesn't always release the system-side picker on `deinit`. Two pickers visible at once is not supported.
4. The picker's observer list is also fragile — adding it on a `PKCanvasView` that's about to be removed from its window first leaves the picker re-anchored to the canvas's old window.
5. (Most subtle) The recycle-time Fabric prop diff problem from §1 also applies here: if Fabric thinks `showToolPicker` hasn't changed on the next mount (because both are `false`), the Swift `didSet` doesn't run, and the picker stays attached.

**Fix:** A combination:

- One process-wide `Self.sharedToolPicker: PKToolPicker?` static. Per-canvas visibility is the only thing that changes.
- `detachToolPicker()` hides → unhooks observers → resigns first responder, in that order. It runs even when `isToolPickerAttached` is `false` because the picker can be in a half-attached state from a sibling surface.
- The function nils the shared static **only when the calling surface was the picker's owner**, so a sibling surface that's still using the shared picker doesn't get it yanked out from under it.
- `willMove(toWindow:)` calls `detachToolPicker()` when the surface leaves the window, so navigation pops / modal dismisses always tear down.
- `prepareForReuse` calls `detachToolPicker()` explicitly even after `showToolPicker = false` fires `didSet` — the picker might be lingering from a sibling.

**Generalised lesson:** When a system framework uses XPC for its UI (PencilKit, Quick Look, the share sheet…), assume:

- Visibility-toggling APIs are advisory, not authoritative.
- The system UI lives longer than the Swift object that owns it.
- Per-instance models don't compose — anything XPC-backed wants a singleton-per-process.

When you're debugging a "lingering UI" bug, the question to ask first is: "what would happen if the Swift object I'm releasing never actually deallocates?" Then design for that case.

## 4. PencilKit: dark-mode color inversion on export

**Symptom:** Phone in dark mode. Draw with the default black ink. On-screen, the ink is black. `copyToClipboard` → paste into Notes → the ink is white. Same for `toBase64`, `toFile`, `saveToPhotoLibrary`. We initially assumed the exports were broken; took screenshots and overlaid them to confirm the on-screen pixels really were black.

**Root cause:** `PKDrawing.image(from:scale:)` resolves dark-aware ink colors against the **current trait collection** at draw time. The on-screen canvas was pinned to `.light` via `overrideUserInterfaceStyle`, but `PKDrawing.image(...)` doesn't inherit from any view's trait collection — it uses whatever's current when it runs. On a dark-mode host, "black" resolved to near-white.

**Fix:** Wrap the export render in `UITraitCollection(userInterfaceStyle: .light).performAsCurrent { … }`. The two-line wrapper around the single line that calls `drawing.image(from: rect, scale: scale)`.

A related variant: the **tool picker** also produces trait-adaptive ink. When the user picks "black" in the picker on a dark host, the picker hands `canvasView.tool` an inking tool whose color resolves to white in dark mode. We installed our own `PKToolPickerObserver` that rewrites the tool with `inking.color.resolvedColor(with: lightTraits)` after the picker fires its built-in observer. Observer order matters — the picker's own observer assigns the tool first, ours runs second and rewrites it.

**Generalised lesson:** "Trait-adaptive" anything in UIKit / PencilKit / SwiftUI is a tax you pay even when you don't want it. If your view is meant to render over a host-controlled background (i.e. *not* the system's chrome), pin its trait collection and force-resolve any color you hand to system APIs against your pinned traits. Don't trust that pinning the view is enough — APIs that take an asset reference (image, color, drawing) often re-resolve against the current trait collection at call time.

## 5. PencilKit: the photo library is not white

**Symptom:** `saveToPhotoLibrary` works. Open the saved image in Photos — the signature is on a black background, even though `backgroundColor` is set to white in the example. `toBase64` of the same drawing displays fine against a light parent in another app.

**Root cause:** The iOS Photos viewer renders transparent PNGs against its own viewer chrome, which is black. Our `toBase64` / `toFile` exports were transparent (correctly — the host might want to composite the signature over anything). But for the photo library, "transparent on black" looks broken to users who drew on white.

**Fix:** `saveToPhotoLibrary` always renders `opaque: true`. The render path composites the canvas's `inkBackgroundColor` (or white when it's `clear`) into the saved asset, so the photo library result matches what the user saw on screen. Other export paths stay transparent by default.

**Generalised lesson:** "Export" is not one thing. The right pixel composition depends on where the image is going to be rendered. For destinations under your control (clipboard, file URI, base64), preserve alpha so consumers can composite. For destinations under someone else's control (photo library, share sheet), bake in the background — because you don't get to argue with how the system viewer renders.

## 6. Android Fabric eats `requestLayout()`

**Symptom:** Toggling the toolbar at runtime sometimes leaves the icons at 0×0. Changing `toolbarHeight` does nothing. Switching `toolbarPosition` from `bottom` to `top` doesn't move the bar. We tried four iterations before landing on the working approach.

**Iteration history:**

1. Just call `requestLayout()` from each setter. Did nothing — Fabric's parent ViewGroup swallows the bubbled layout request.
2. `requestLayout()` + `post(measureAndLayout)`: post a manual measure-and-layout on the UI thread. Mostly worked, but failed under specific timing — cached `MeasureSpec`s and the `PFLAG_FORCE_LAYOUT` flag getting cleared on the way through made the posted pass short-circuit.
3. The above plus a recursive `forceLayoutTree` helper that sets `PFLAG_FORCE_LAYOUT` on every descendant. Worked most of the time. Failed unpredictably on the toolbar icons specifically — they'd render at 0×0 about 1 in 10 toggles.
4. The actual fix: bypass the indirection entirely. Override `onMeasure` / `onLayout` to handle the Yoga-driven initial pass, and have every setter call `applyChildLayout()` which calls `layoutChildrenAt(width, height)` — measuring and `.layout(...)`-ing the canvas and toolbar children **directly**. No `requestLayout()`, no posted runnable.

**Root cause:** Fabric on Android assumes layout is driven from Yoga, not from native descendants. When a native view inside a Fabric tree calls `requestLayout()`, the parent silently absorbs it because Fabric's reconciler doesn't believe layout originates from below. Workarounds via posted runnables interact unpredictably with the `MeasureSpec` cache.

**Fix:** Synchronous layout. The custom parent (`SignatureInkView`) owns its children's positioning explicitly via `child.measure(...)` + `child.layout(...)` calls. Initial mount still flows through Yoga via the `onMeasure`/`onLayout` overrides; everything else runs synchronously in setters.

**Generalised lesson:** Fabric on Android is not a forgiving "drop your custom ViewGroup in and it'll work" environment. If your component's internal layout depends on prop changes (not just on Yoga-computed outer bounds), don't try to push them up through `requestLayout()` — own the layout pass yourself. The synchronous-from-setter pattern is also easier to reason about and easier to debug than chasing layout passes that may or may not run.

> **Update:** the "no `requestLayout()`, no posted runnable" conclusion turned out to be too absolute — synchronous-from-setter has a hole when a prop update lands *before* the view has a size. We later re-introduced a posted `measureAndLayout` as a safety net; see [§14a](#14-android-toolbar-at-runtime-stale-rebuilds-and-lying-measurements).

## 7. The dp/px unit trap on Android

**Symptom:** `penMaxWidth={3}` looks very different between iOS and Android. On a Pixel 6 the strokes are spidery and almost invisible; on iOS at the same value they're a reasonable hand-writing weight.

**Root cause:** Android draw APIs (`Paint.strokeWidth`, `Canvas.drawCircle(radius)`, SVG `stroke-width`, the `Bezier.draw` `paint.strokeWidth` assignment) all operate in **raw pixels**. We were storing pen widths as the literal JS prop value and handing them straight to those APIs, so a `3` rendered as 3 pixels — about 1pt on a 3× device. Meanwhile iOS interpreted `3` as 3 points.

The bug had a hidden facet: stroke data captured with `getStrokeData()` stored per-stroke `minWidth`/`maxWidth` as raw pixels. Round-tripping that data via `setStrokeData()` would re-interpret the numbers as dp on render, producing strokes that were 3× too thick. Cross-device round-trips (capture on a 3× device, render on a 1×) were even more broken.

**Fix:** Store *everything* in dp internally and convert at the point of use:

- `penMinWidth`, `penMaxWidth`, `lastWidth`, `Stroke.minWidth`, `Stroke.maxWidth`, `baselineWidth`, `baselineOffsetFromBottom` — all dp.
- A single `dpToPx(dp: Float)` helper. Called at every site that hands a value to a raw-pixel API: `paint.strokeWidth = dpToPx(...)`, `canvas.drawCircle(p.x, p.y, dpToPx(r), paint)`, `bezier.draw(canvas, paint, dpToPx(lastWidth), dpToPx(newWidth))`, SVG `<path stroke-width="${dpToPx(...)}">`, `totalBounds` padding.

Adding a new draw call that takes a width is the riskiest change in the file; the comment on `dpToPx` exists to flag it.

**Generalised lesson:** Pick **one** unit and store everything in it. The reason this bug took several rounds is that we'd fix one site (`Paint.strokeWidth`) but leave another (`Canvas.drawCircle`'s radius for end caps) using raw pixels. A grep for the unit type at every API boundary is mandatory work whenever you add a new draw site. Better yet: store in the unit system that matches the props you accept (dp here, since the JS prop is unitless and meant to be device-independent) and put conversions only at the API boundary, not in the middle of business logic.

## 8. The baseline-jumps-when-toolbar-toggles bug

**Symptom:** Toolbar at bottom, baseline visible just above it. Move `toolbarPosition` to `top`. The baseline jumps to the absolute bottom edge of the canvas, far away from the toolbar.

**Root cause:** The baseline's vertical position was computed as `height - baselineOffsetFromBottom` regardless of where the toolbar lived. When the toolbar moved to the top, the canvas got shorter (toolbar height subtracted from the top), but the baseline formula didn't change — so it ended up at the very bottom of the (now shorter) canvas, way below the toolbar.

**Fix:** A `BaselineAnchor` enum (`OFFSET_FROM_BOTTOM`, `TOP_EDGE`, `BOTTOM_EDGE`) that explicitly says where the baseline should sit. `SignatureInkView.syncBaselineAnchor()` computes the right anchor on every `setShowToolbar` / `setToolbarPosition` change:

- No toolbar → `OFFSET_FROM_BOTTOM` (honour the explicit `baselineOffsetFromBottom` prop).
- Toolbar at bottom → `BOTTOM_EDGE` (the baseline sits flush against the canvas bottom, which is the toolbar's top edge).
- Toolbar at top → `TOP_EDGE` (the baseline sits flush against the canvas top, which is the toolbar's bottom edge).

This mirrors what we'd already done on iOS implicitly inside `layoutBaseline`.

**Generalised lesson:** When a derived value can be computed multiple valid ways and the choice depends on a piece of context, name the choice. A boolean (`baselineAnchorToCanvasBottom`) loses meaning the moment a third case arrives. An enum is self-documenting and forces the caller to think about all cases when the set of contexts changes.

## 9. Android replay jump: the rolling-window bug

**Symptom:** Draw a parabola (left → down → right). `replay()`. The animation visibly "jumps" away from where you started before settling into the correct path.

**Root cause:** The velocity-Bezier algorithm uses a 4-point rolling window — it renders the curve segment between `points[1]` and `points[2]`. So the very first leading segment (`p[0] → p[1]`) is never drawn during normal use. At 60–120 Hz sampling that's imperceptible because the next sample arrives instantly and the missing pixel gets covered.

During replay, the algorithm replays one point per frame slice. At `take == 2` the flush draws `p[0] → p[1]` as a connector line (the "best-effort tail" code path). At `take == 3` the flush switches to the rolling-window Bezier which renders `p[1] → p[2]` — and the leading segment we drew at `take == 2` vanishes. To the user this looks like the stroke jumps away from its true starting position.

**Fix:** Detect `activePoints.size == 2` during the rolling-window feed and explicitly draw the leading segment with a width-anchored straight line. From that point on, the rolling Bezier covers everything else cleanly.

**Generalised lesson:** Algorithms that work fine at "everything happens at native sampling speed" frequently break when you replay them at a different rate. Whenever you replay or step through a real-time algorithm, every "this would be invisible" optimisation needs an explicit checkpoint. If it's invisible during normal use, it'll show up as a visible artifact at any other rate.

## 10. Android clipboard: `FileUriExposedException`

**Symptom:** First call to `copyToClipboard()` on Android instantly crashes the app:

```
FATAL EXCEPTION: main
android.os.FileUriExposedException: file:///data/.../cache/signature-clipboard.png exposed beyond app through ClipData.Item.getUri()
```

**Root cause:** Since Android 7 (API 24), sharing `file://` URIs cross-process is forbidden. The clipboard is cross-process. We were writing the PNG to `context.cacheDir/signature-clipboard.png` and putting `Uri.fromFile(file)` on the clipboard.

**Fix:** Bundle a `FileProvider` in the library's own `AndroidManifest.xml`, register a paths XML (`res/xml/signature_ink_file_paths.xml`) exposing the cache directory, and use `FileProvider.getUriForFile(context, "${packageName}.signatureinkprovider", file)` to get a `content://` URI. Put that on the clipboard, and call `context.grantUriPermission("com.android.systemui", uri, FLAG_GRANT_READ_URI_PERMISSION)` so the Android 13+ clipboard preview can read the bitmap for the thumbnail.

Bundling the FileProvider in the library (rather than asking host apps to declare one) means consumers get a working `copyToClipboard()` out of the box. The provider authority is namespaced (`${packageName}.signatureinkprovider`) so it doesn't collide with one the host app might declare for its own purposes.

**Generalised lesson:** Any time you produce a file inside a library and hand it to a system service (clipboard, share sheet, intent extra), it must be `content://`. The friction of bundling a `FileProvider` once is much smaller than the friction of every consumer hitting this crash and having to read the docs. Treat this as part of the library's contract, not part of the host app's setup.

Namespacing the *authority* turned out not to be enough, though — see §15.

## 11. Recurring bugs are a smell

The tool picker bug (§3) was "fixed" four times before we understood it. The Fabric recycle bug (§1) was "fixed" three times before we landed on "reset everything." The Android pen-width unit bug (§7) was "fixed" twice before we realised we'd missed a draw site.

**The pattern:** in each case, the first fix addressed the *specific* symptom we'd seen, not the *class* of symptom. The bug reappeared under a new prop name, on a new sibling, in a new code path, and we'd fix it again, narrowly, and ship.

**The lesson:** When a bug recurs more than once with a different shape:

1. **Stop fixing it.** Whatever you're about to do is also a partial fix.
2. **Write down the actual rule.** "It's specifically about `showToolPicker`" is a partial rule. "Fabric skips setters when `newProps[k] == oldProps[k]` and `oldProps == defaults`, so any prop that defaults to the most common value will recycle stale" is an actual rule.
3. **Audit every site that obeys the rule, not just the one that broke.** Reset every `@objc public var` in `prepareForReuse`, not just the four you've gotten complaints about. Convert every draw site through `dpToPx`, not just the one in the screenshot.
4. **Add a comment or convention that protects the next change.** "KEEP IN SYNC with the `@objc public var` declarations above. If you add a new prop, add a reset line here too."

This is the most important meta-lesson in the whole project. About half the total bug-fix time was spent re-fixing problems we'd already "fixed."

## 12. Build-system papercuts we'd save you from

Not bugs in the library, but in the toolchain around it. Several days of total time went here.

- **Bridging headers don't work with Swift framework targets.** Xcode error: `Using bridging headers with framework targets is unsupported`. Our `SignatureInk.podspec` builds a framework target, so the auto-generated `SignatureInk-Bridging-Header.h` from `create-react-native-library` breaks compilation. Fix: delete the bridging header. Swift can `import` Obj-C system frameworks (`UIKit`, `PencilKit`) directly; the bridging header is only needed when you want to import Obj-C **source** into Swift, which we don't do here.
- **`PKCanvasViewDelegate` not visible in `SignatureInk-Swift.h`.** PencilKit is a Swift module; protocols from Swift modules don't survive the round-trip into the generated Obj-C header. Fix: don't expose any `@objc` symbol whose signature mentions a Swift-framework type. Our `canvasView` is `internal` (not `@objc`), and the Obj-C++ host never touches it directly — it goes through `@objc public var`s with primitive types only.
- **`Commands` is a reserved export name.** Re-exporting `Commands` from `src/index.tsx` triggers `'Commands' is a reserved export and may only be used to export the result of codegenNativeCommands`. Codegen's parser is picky about which file declares it; we keep `Commands` internal to `SignatureInkViewNativeComponent.ts` and forward via `SignatureInk`'s ref interface.
- **`topChange` is reserved by RN core.** Naming our drawing-changed event `onChange` causes the codegen-emitted Android event name `topChange` to collide with `TextInput`/`Switch`'s registration, clobbering payload typing. Fix: rename to `onStrokesChange` (codegen-derived to `topStrokesChange`).
- **`example/metro.config.js` fragility.** `react-native-monorepo-config` expects `baseConfig.resolver.blockList` to be iterable; some RN versions ship it as `undefined`. Fix: pass an explicit empty array.
- **CMake SDK version mismatch on Android.** `[CXX5304] This version only understands SDK XML versions up to 3 but an SDK XML file of version 4 was encountered.` Comes from a mismatch between Android Studio's NDK and the command-line tools' NDK. Fix: pin both to the same version, or upgrade the older one.
- **Codegen needs a clean rebuild on prop changes.** Adding a prop in the spec file and running `yarn example ios` without `cd example/ios && pod install` first will silently use the stale generated headers. On Android, run `cd example/android && ./gradlew clean`.

**Generalised lesson:** The codegen + Fabric + RN-CLI + builder-bob stack is sharper-edged than the documentation suggests. Many of these errors have unhelpful messages; recognising them by sight is most of the recovery time. Document the ones you hit, so the next person spends seconds rather than hours.

## 13. API design lessons

A few decisions paid off, in retrospect:

- **One generic `onResult` event for every async command.** Adding a new command (`saveToPhotoLibrary` after the initial design) was a two-line native change + a wrapper entry. If we'd designed one event per command, every new command would be a codegen-spec change + a clean rebuild + an iOS event-emitter struct + a Kotlin event class.
- **JSDoc on every public type, with defaults documented inline.** Editor tooltips become the primary documentation surface for consumers; they very rarely click through to the README for a one-line "what is `velocityFilterWeight`" question.
- **Density-independent units everywhere on the consumer surface.** No `penWidthDp` vs `penWidthPx` distinction. Consumers think in "thickness on the screen", not in "pixels on the screen", and we hide the unit difference.
- **Defaults that match each other across platforms.** `penMinWidth=1 / penMaxWidth=3` matches between iOS and Android out of the box. The cost (figuring out the right starting values) was small; the alternative (consumers tweaking values per-platform) compounds every release.
- **Splitting the example into per-feature screens.** A single all-features screen sounded simpler but made each bug hard to isolate. The Toolbar & Gaps → Showcase navigation is exactly the bug-reproduction surface that exposed the recycle-state leak in §1.
- **`SafeAreaView` everywhere in the example.** Sounds trivial; we forgot it at first and ended up debugging "the toolbar overlaps the home indicator" as if it were a library bug.

A few decisions we'd revisit:

- **Padding the showcase screen for the iOS tool picker.** The picker covers the bottom ~220pt of the screen. We added 260pt of bottom padding when the picker is on. A more correct solution would be a `PKToolPickerObserver` callback into JS exposing the picker's actual frame, but the demo-app-only nature of the problem made the hard-coded padding pragmatic. If we ship a `<SignatureInk />` that needs to render content under the picker in a real app, we'd build the observer wiring.
- **No watermark support in v1.** The natural design (React children inside `<SignatureInk>{children}</SignatureInk>`, positioned `absolute`, `pointerEvents="box-none"` overlay) is easy. The hard part is whether watermarks should be **burned into exports** — which requires either ViewShot snapshotting or per-platform native image compositing. We deferred this until there's a concrete enterprise use case to design against, rather than picking the wrong shape and being stuck with it.

## 14. Android toolbar at runtime: stale rebuilds and lying measurements

Adding the object-based toolbar (icons + text labels + an overflow menu) reopened the Android layout box from §6. It split into two independent root causes that both presented as "the Android toolbar looks wrong while iOS is fine."

### 14a. Runtime prop changes didn't relayout the toolbar

**Symptom:** Toggle "Text labels" on. iOS rebuilds the bar — labels appear, the overflow recomputes. Android does nothing: the old icon-only bar stays, and the overflow menu still lists the pre-toggle items. Setting `showText` to `true` by default didn't help either.

**Root cause:** §6's "synchronous `applyChildLayout()` from every setter" approach has a hole — `applyChildLayout()` early-returns when `width <= 0`. Under Fabric a prop update can arrive *before* the view has been laid out, and because `invalidateToolbar()` only bumped a revision counter (no layout request), nothing rescheduled the rebuild — so the change was silently dropped and the stale toolbar (plus its captured overflow snapshot) stayed on screen. iOS never had this hole because its `invalidateToolbar()` calls `setNeedsLayout()`, and UIKit *guarantees* a later `layoutSubviews()`.

**Fix:** Give Android the same guarantee. `invalidateToolbar()` now also calls `requestLayout()`, and a `requestLayout()` override posts a single `measureAndLayout` runnable — `measure(EXACTLY width/height)` + `layout(left, top, right, bottom)` — for the next frame. The synchronous `applyChildLayout()` stays as the no-flicker fast path; the posted pass is the safety net for the size-still-0 case. This walks back §6's "no posted runnable" verdict: the posted pass *is* reliable as long as it measures with the resolved `EXACTLY` size and is guarded against the `width == 0` frames (skip, don't measure with `0`), rather than reusing stale cached `MeasureSpec`s.

### 14b. Off-screen measurement under- and over-counted button widths

**Symptom:** With labels on, the bar overflows *and* clips — the leftmost button ("Undo") is cut off — even though an overflow "…" is already showing. With icons only, an overflow "…" appears when everything plainly fits.

**Root cause:** The visible/overflow split is computed from each button's width, measured off-screen before the view is attached. Two ways that measurement lied:

1. Text buttons set their icon with `setCompoundDrawablesRelativeWithIntrinsicBounds`. **Relative (start/end) compound drawables aren't resolved to left/right until the view's layout direction is resolved** — which hasn't happened for a detached view. So `measure()` omitted the icon width; the capacity math under-counted each labeled button, packed too many inline, and the bar clipped.
2. Icon-only items are laid out in a fixed 44×44 box, but their footprint was read from `measuredWidth` — and a plain `ImageButton` over-reports width (default padding / intrinsic drawable size), so the math over-counted and triggered a spurious overflow.

**Fix:** Make each item's estimated footprint equal what it will actually occupy. Use the absolute `setCompoundDrawablesWithIntrinsicBounds` so the off-screen `measure()` includes the icon (matching iOS's `intrinsicContentSize`; icon stays leading), and use the fixed `slot` width for icon-only items instead of measuring them at all.

**Generalised lesson:** Overflow/capacity math is only as good as the widths you feed it, and an off-screen `measure()` is not the same as the on-screen layout. Anything that resolves lazily on attach (RTL-relative drawables, themed paddings, layout-direction-dependent insets) will be missing or wrong at measure time. Either measure the value the way it will actually be laid out, or — better — derive the footprint from the layout rule you already committed to: a fixed-box child is exactly its box; only `WRAP_CONTENT` children need measuring. And when one platform's intrinsic-size API "just works," port its *result*, not its mechanism.

## 15. The `FileProvider` we bundled broke other people's builds

**Symptom:** Reported as [#2](https://github.com/maitrungduc1410/react-native-signature-ink/issues/2). An app that installs both this library and `@react-native-documents/viewer` can't build Android at all — `:app:processDebugMainManifest` fails before any of our code runs:

```
Attribute provider#androidx.core.content.FileProvider@authorities
  value=(com.michamba.android.reactnativedocumentviewer.fileprovider) from [:react-native-documents_viewer]
  is also present at [:react-native-signature-ink] value=(com.michamba.android.signatureinkprovider).
```

**Root cause:** The manifest merger doesn't match elements positionally — it matches them by a per-element-type *key*, and for `<provider>` that key is `android:name`:

```java
PROVIDER(
        MergeType.MERGE,
        PROVIDER_KEY_RESOLVER,   // delegates to the android:name resolver
        AttributeModel.newModel(SdkConstants.ATTR_NAME).setIsPackageDependent()),
```

We had declared `android:name="androidx.core.content.FileProvider"`. So had they. Two different libraries, same key — the merger concluded these were one node declared twice and tried to reconcile two authorities and two `FILE_PROVIDER_PATHS` values into one element. There is no correct reconciliation, so it errors out. Note this is not specific to that library: the host app declaring its own `androidx.core.content.FileProvider` collides with us just as hard, which makes the blast radius much larger than one unlucky dependency pair.

We'd namespaced the *authority* (§10) and stopped there, assuming that was the collision surface. It's the runtime collision surface. The build-time one is the class name.

**Non-fix:** `tools:replace="android:authorities"` in the host app. It makes the build pass by picking one authority and dropping the other, so whichever library lost silently throws `Couldn't find meta-data for provider with authority …` the first time it tries to share a file. Trading a build error for a runtime crash in someone else's code is worse than the build error.

**Fix:** Ship a one-line subclass, [`SignatureInkFileProvider`](android/src/main/java/com/signatureink/SignatureInkFileProvider.kt), and point `android:name` at it. Nothing else changes — `FileProvider.getUriForFile` resolves the path strategy via `PackageManager.resolveContentProvider(authority, GET_META_DATA)`, so it only ever cared about the authority, which we didn't touch. Existing consumers see no behavioural difference and no migration.

Two traps while doing this:

- The `<meta-data android:name="android.support.FILE_PROVIDER_PATHS">` child stays. AndroidX 1.9+ added a `protected FileProvider(@XmlRes int)` constructor that reads the paths XML from the subclass, which makes the meta-data look redundant — but the **static** `getUriForFile(context, authority, file)` overload hardcodes `ResourcesCompat.ID_NULL` and re-parses the meta-data through `PackageManager`. Remove the meta-data and every clipboard copy throws `Missing android.support.FILE_PROVIDER_PATHS meta-data`.
- Resources have the same problem one layer down, and it's quieter. The other library used `@xml/file_paths`; if we had too, the resource merger would have silently let one definition win instead of failing the build. `signature_ink_file_paths.xml` was already namespaced, so this one we got right by accident.

**Generalised lesson:** In a library, every identifier that lands in the merged manifest or the merged resource table is a global name in the consumer's app, and someone else will pick the obvious one. That includes the things that don't feel like your names — a framework class you're only *referencing*, like `androidx.core.content.FileProvider`, still becomes your merge key. Assume every entry you contribute will coexist with a stranger's entry of the same shape, and namespace the class name, the authority, and the resource file, not just the one that's documented as needing it. And unlike our other bugs, this one costs the consumer their entire build, not a feature — a library's manifest contributions deserve the same scrutiny as its public API.

---

If you found a new sharp edge while working on this library, **please add it here.** The whole point of this file is to make sure each painful lesson gets paid for exactly once.
