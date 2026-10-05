---
description: "Fixes for common SignatureInk problems: nothing draws, invisible toolbar icons, Promise errors, photo library permissions, dark mode ink and build issues."
---

# Troubleshooting

## Nothing draws {#nothing-draws}

- **The view has no size.** `SignatureInk` has no intrinsic height. Give it a `height` or `flex: 1` inside a parent that has a size.
- **`pencilOnly` is on.** Fingers are ignored on both platforms. On Android the stylus eraser end is ignored too.
- **The ink matches the background.** The default pen is black (iOS) or `#111111` (Android) and does not follow dark mode. Set `penColor` for dark backgrounds. See [Dark backgrounds](/guide/quick-start#dark-backgrounds).
- **The New Architecture is off.** The library ships a Fabric component only. See [Installation](/guide/installation#requirements).

## Toolbar icons are invisible on Android {#invisible-icons}

Without `toolbarTintColor`, Android draws save, share, download, check and the "…" overflow button in white. Set `toolbarTintColor` (or `tintColor` per button) to a color that contrasts with your background. See [Toolbar colors](/guide/toolbar#colors).

## Overflow menu shows "undo" in lowercase {#overflow-labels}

Menu entries use `accessibilityLabel`, which falls back to `text` and then to `id`. Give items that may overflow a `text` or an `accessibilityLabel`:

```tsx
toolbarButtons={[{ id: 'undo', accessibilityLabel: 'Undo' }]}
```

## "SignatureInk: native view is not mounted yet" {#not-mounted}

A Promise method (`toBase64`, `toFile`, `toSvg`, `getStrokeData`, `isEmpty`, `saveToPhotoLibrary`) was called before the native view existed. Call it from an event handler or after the component has mounted, and use optional chaining on the ref.

## "SignatureInk unmounted" {#unmounted}

The component unmounted while a Promise method was still waiting for the native side, for example when the user navigated away during an export. Pending calls are rejected so they never hang. Catch the error, or ignore it if the screen is gone anyway.

## "Failed to encode image" or "Failed to render bitmap" {#render-failed}

The native side could not produce an image. On Android this happens when the view has not been laid out yet (zero size). Make sure the view is visible and has a size before you export.

## saveToPhotoLibrary {#photo-library}

- **The iOS app crashes on save.** `NSPhotoLibraryAddUsageDescription` is missing from `Info.plist`. iOS terminates apps that ask for photo access without it.
- **It resolves with `granted: false` on iOS.** The user denied access earlier. iOS will not ask again; send the user to Settings with `Linking.openSettings()`.
- **It rejects on Android 9 and older.** Writing to the gallery needs `WRITE_EXTERNAL_STORAGE` there. Declare it with `android:maxSdkVersion="28"` and request it with `PermissionsAndroid` before saving.
- **The saved PNG has a black background in the gallery (Android).** The PNG is transparent when `backgroundColor` is not set, and some gallery apps show transparency as black. Set `backgroundColor` or use `format: 'jpeg'`. See [Backgrounds](/guide/export#backgrounds).

## Exports look different on iOS and Android {#exports-differ}

Most of this is by design. PNGs are always transparent on iOS but include `backgroundColor` on Android, trim margins differ, and SVG units are points on iOS and pixels on Android. The full list is on [iOS vs Android](/guide/platform-differences#exports).

## Restored strokes have the wrong color {#restored-color}

Stroke data does not store colors. `setStrokeData()` draws with the current `penColor` (and on Android the current pen widths). Set those props before restoring. See [Restoring](/guide/stroke-data#restoring).

## Strokes disappear after an interrupted replay {#replay-lost}

If the user draws, or you call `undo()`, `redo()`, `clear()` or `setStrokeData()` during `replay()`, only the strokes revealed so far are kept. Save the stroke data before replaying and restore it if needed. See [Interrupting](/guide/stroke-data#interrupting).

## Undo behaves differently on Android {#undo-android}

On Android `undo()` only removes strokes: `clear()` cannot be undone, and after `setStrokeData()` undo removes the restored strokes one at a time. iOS treats `clear()` and `setStrokeData()` as undoable steps. See [History](/guide/methods#history).

## The ink type has no effect {#ink-type}

`defaultInkType` is iOS only. `monoline`, `fountainPen`, `watercolor` and `crayon` need iOS 17; earlier versions fall back to `pen`.

## Build errors after upgrading {#build-errors}

The native code is generated from the TypeScript spec. After upgrading, run `pod install` in `ios/`, rebuild the native app, and on Android run `./gradlew clean` if generated files look stale. In Expo, run `npx expo prebuild --clean` and rebuild. Expo Go is not supported.

## Still stuck? {#still-stuck}

Open an issue on [GitHub](https://github.com/maitrungduc1410/react-native-signature-ink/issues) with your React Native version, platform and OS version, and a minimal snippet. Trying the example app from the repository first often shows whether the problem is in the library or in the surrounding layout.
