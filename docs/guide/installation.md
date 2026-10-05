---
description: "Install react-native-signature-ink in a bare React Native or Expo app, enable the New Architecture and add the photo library permissions."
---

# Installation

## Requirements {#requirements}

- React Native **0.75 or newer** with the **New Architecture** enabled, or **Expo SDK 51+** with the New Architecture enabled (it is on by default from SDK 52).
- **iOS**: the minimum iOS version of your React Native release. The podspec uses `min_ios_version_supported` and links `UIKit` and `PencilKit`.
- **Android**: API 24 (Android 7.0) or newer.

The library has no third-party native dependencies: no Skia, no Reanimated, no WebView.

## Add the package {#add-the-package}

::: code-group

```sh [npm]
npm install react-native-signature-ink
```

```sh [yarn]
yarn add react-native-signature-ink
```

:::

The library is autolinked. There is no config plugin and nothing to register by hand.

## iOS {#ios}

```sh
cd ios && pod install
```

If you call [`saveToPhotoLibrary()`](/guide/export#photo-library), add this key to your app's `Info.plist`. iOS terminates the app if the key is missing when the permission prompt is needed.

```xml
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save your signature to your photo library.</string>
```

## Android {#android}

No setup is needed on API 29 and newer.

To use `saveToPhotoLibrary()` on API 28 and older, declare the legacy storage permission in your app's `AndroidManifest.xml`:

```xml
<uses-permission
  android:name="android.permission.WRITE_EXTERNAL_STORAGE"
  android:maxSdkVersion="28" />
```

The library ships its own `FileProvider` (class `com.signatureink.SignatureInkFileProvider`, authority `${applicationId}.signatureinkprovider`) for [`copyToClipboard()`](/guide/export#clipboard). It is merged into your manifest automatically and does not conflict with other `FileProvider` declarations.

## Expo {#expo}

The library works in [development builds](https://docs.expo.dev/develop/development-builds/introduction/) and in any project that runs `expo prebuild`. It does not run in Expo Go, which cannot load custom native code.

```sh
npx expo install react-native-signature-ink
npx expo prebuild   # or build a dev client / EAS build
```

On SDK 51, turn on the New Architecture in `app.json` with `"newArchEnabled": true`.

Declare the iOS photo permission in `app.json` instead of editing `Info.plist`, because prebuild regenerates it:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryAddUsageDescription": "Save your signature to your photo library."
      }
    }
  }
}
```

For `saveToPhotoLibrary()` on Android API 28 and older, add `WRITE_EXTERNAL_STORAGE` with a small config plugin or [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/). The clipboard `FileProvider` needs no setup.

## After upgrading {#after-upgrading}

The native views are generated from the TypeScript spec at build time. After you upgrade the package, run `pod install` again and rebuild the native app; a Metro reload is not enough. If Android picks up stale generated code, run `./gradlew clean` in `android/`.

## Next {#next}

Continue with the [Quick start](/guide/quick-start).
