---
description: "在原生 React Native 或 Expo 应用中安装 react-native-signature-ink，启用新架构并添加相册权限。"
---

# 安装

## 环境要求 {#requirements}

- React Native **0.75 或更高版本**并启用**新架构**，或 **Expo SDK 51+** 并启用新架构（SDK 52 起默认开启）。
- **iOS**：与你所用 React Native 版本的最低 iOS 版本一致。podspec 使用 `min_ios_version_supported`，并链接 `UIKit` 和 `PencilKit`。
- **Android**：API 24（Android 7.0）或更高。

本库没有任何第三方原生依赖：不需要 Skia、Reanimated 或 WebView。

## 添加依赖 {#add-the-package}

::: code-group

```sh [npm]
npm install react-native-signature-ink
```

```sh [yarn]
yarn add react-native-signature-ink
```

:::

本库支持自动链接。没有 config plugin，也无需手动注册。

## iOS {#ios}

```sh
cd ios && pod install
```

如果调用 [`saveToPhotoLibrary()`](/zh/guide/export#photo-library)，请在应用的 `Info.plist` 中添加以下键。需要弹出权限请求时如果缺少该键，iOS 会直接终止应用。

```xml
<key>NSPhotoLibraryAddUsageDescription</key>
<string>将你的签名保存到相册。</string>
```

## Android {#android}

API 29 及以上无需任何配置。

如需在 API 28 及以下使用 `saveToPhotoLibrary()`，请在应用的 `AndroidManifest.xml` 中声明旧版存储权限：

```xml
<uses-permission
  android:name="android.permission.WRITE_EXTERNAL_STORAGE"
  android:maxSdkVersion="28" />
```

本库自带用于 [`copyToClipboard()`](/zh/guide/export#clipboard) 的 `FileProvider`（类 `com.signatureink.SignatureInkFileProvider`，authority 为 `${applicationId}.signatureinkprovider`）。它会自动合并到你的 manifest 中，不会与其他 `FileProvider` 声明冲突。

## Expo {#expo}

本库可在[开发构建](https://docs.expo.dev/develop/development-builds/introduction/)以及任何使用 `expo prebuild` 的项目中运行。Expo Go 无法加载自定义原生代码，因此不受支持。

```sh
npx expo install react-native-signature-ink
npx expo prebuild   # 或构建 dev client / EAS build
```

在 SDK 51 上，请在 `app.json` 中设置 `"newArchEnabled": true` 以启用新架构。

iOS 相册权限请在 `app.json` 中声明，而不是直接修改 `Info.plist`，因为 prebuild 会重新生成该文件：

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryAddUsageDescription": "将你的签名保存到相册。"
      }
    }
  }
}
```

如需在 Android API 28 及以下使用 `saveToPhotoLibrary()`，可通过一个小型 config plugin 或 [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/) 添加 `WRITE_EXTERNAL_STORAGE`。剪贴板用到的 `FileProvider` 无需配置。

## 升级之后 {#after-upgrading}

原生视图在构建时由 TypeScript 规范生成。升级本库后，请重新运行 `pod install` 并重新构建原生应用，仅重新加载 Metro 是不够的。如果 Android 仍在使用旧的生成代码，请在 `android/` 中运行 `./gradlew clean`。

## 下一步 {#next}

继续阅读[快速开始](/zh/guide/quick-start)。
