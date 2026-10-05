---
description: "Cài react-native-signature-ink vào app React Native thuần hoặc Expo, bật New Architecture và khai báo quyền truy cập thư viện ảnh."
---

# Cài đặt

## Yêu cầu {#requirements}

- React Native **0.75 trở lên** với **New Architecture** đã bật, hoặc **Expo SDK 51+** với New Architecture đã bật (mặc định bật từ SDK 52).
- **iOS**: phiên bản iOS tối thiểu của bản React Native bạn đang dùng. Podspec dùng `min_ios_version_supported` và link `UIKit` cùng `PencilKit`.
- **Android**: API 24 (Android 7.0) trở lên.

Thư viện không phụ thuộc native nào của bên thứ ba: không Skia, không Reanimated, không WebView.

## Thêm package {#add-the-package}

::: code-group

```sh [npm]
npm install react-native-signature-ink
```

```sh [yarn]
yarn add react-native-signature-ink
```

:::

Thư viện được autolink. Không có config plugin và không cần đăng ký gì bằng tay.

## iOS {#ios}

```sh
cd ios && pod install
```

Nếu bạn gọi [`saveToPhotoLibrary()`](/vi/guide/export#photo-library), hãy thêm key sau vào `Info.plist` của app. iOS sẽ tắt app nếu thiếu key này khi cần hiện hộp thoại xin quyền.

```xml
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Lưu chữ ký của bạn vào thư viện ảnh.</string>
```

## Android {#android}

Từ API 29 trở lên không cần cấu hình gì.

Để dùng `saveToPhotoLibrary()` trên API 28 trở xuống, khai báo quyền lưu trữ cũ trong `AndroidManifest.xml` của app:

```xml
<uses-permission
  android:name="android.permission.WRITE_EXTERNAL_STORAGE"
  android:maxSdkVersion="28" />
```

Thư viện có sẵn `FileProvider` riêng (class `com.signatureink.SignatureInkFileProvider`, authority `${applicationId}.signatureinkprovider`) cho [`copyToClipboard()`](/vi/guide/export#clipboard). Nó được merge vào manifest tự động và không xung đột với các khai báo `FileProvider` khác.

## Expo {#expo}

Thư viện chạy trong [development build](https://docs.expo.dev/develop/development-builds/introduction/) và mọi project dùng `expo prebuild`. Nó không chạy trên Expo Go, vì Expo Go không load được native code tuỳ chỉnh.

```sh
npx expo install react-native-signature-ink
npx expo prebuild   # hoặc build dev client / EAS build
```

Trên SDK 51, bật New Architecture trong `app.json` bằng `"newArchEnabled": true`.

Khai báo quyền ảnh của iOS trong `app.json` thay vì sửa `Info.plist`, vì prebuild sẽ sinh lại file này:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryAddUsageDescription": "Lưu chữ ký của bạn vào thư viện ảnh."
      }
    }
  }
}
```

Với `saveToPhotoLibrary()` trên Android API 28 trở xuống, thêm `WRITE_EXTERNAL_STORAGE` bằng một config plugin nhỏ hoặc [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/). `FileProvider` cho clipboard không cần cấu hình.

## Sau khi nâng cấp {#after-upgrading}

Native view được sinh từ TypeScript spec lúc build. Sau khi nâng cấp package, hãy chạy lại `pod install` và build lại app native; reload Metro là chưa đủ. Nếu Android vẫn dùng code sinh cũ, chạy `./gradlew clean` trong `android/`.

## Tiếp theo {#next}

Tiếp tục với [Bắt đầu nhanh](/vi/guide/quick-start).
