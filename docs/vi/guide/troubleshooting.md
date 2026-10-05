---
description: "Cách xử lý các lỗi thường gặp với SignatureInk: không vẽ được, icon toolbar vô hình, lỗi Promise, quyền thư viện ảnh, mực ở dark mode và lỗi build."
---

# Khắc phục sự cố

## Không vẽ được gì {#nothing-draws}

- **View không có kích thước.** `SignatureInk` không có chiều cao nội tại. Hãy đặt `height` hoặc `flex: 1` bên trong một view cha có kích thước.
- **`pencilOnly` đang bật.** Ngón tay bị bỏ qua trên cả hai nền tảng. Trên Android, đầu tẩy của stylus cũng bị bỏ qua.
- **Mực trùng màu nền.** Bút mặc định màu đen (iOS) hoặc `#111111` (Android) và không đổi theo dark mode. Hãy đặt `penColor` cho nền tối. Xem [Nền tối](/vi/guide/quick-start#dark-backgrounds).
- **New Architecture đang tắt.** Thư viện chỉ cung cấp Fabric component. Xem [Cài đặt](/vi/guide/installation#requirements).

## Icon toolbar vô hình trên Android {#invisible-icons}

Khi không có `toolbarTintColor`, Android vẽ save, share, download, check và nút overflow "…" màu trắng. Hãy đặt `toolbarTintColor` (hoặc `tintColor` cho từng nút) thành màu tương phản với nền. Xem [Màu toolbar](/vi/guide/toolbar#colors).

## Menu overflow hiện "undo" chữ thường {#overflow-labels}

Mục trong menu dùng `accessibilityLabel`, nếu không có thì lấy `text` rồi đến `id`. Hãy đặt `text` hoặc `accessibilityLabel` cho các nút có thể bị đẩy vào overflow:

```tsx
toolbarButtons={[{ id: 'undo', accessibilityLabel: 'Hoàn tác' }]}
```

## "SignatureInk: native view is not mounted yet" {#not-mounted}

Một phương thức trả về Promise (`toBase64`, `toFile`, `toSvg`, `getStrokeData`, `isEmpty`, `saveToPhotoLibrary`) bị gọi trước khi native view tồn tại. Hãy gọi nó từ một handler sự kiện hoặc sau khi component đã mount, và dùng optional chaining trên ref.

## "SignatureInk unmounted" {#unmounted}

Component bị unmount trong lúc một phương thức Promise còn đang chờ phía native, ví dụ khi người dùng rời màn hình giữa lúc xuất ảnh. Các lệnh đang chờ bị reject để không bao giờ treo. Hãy bắt lỗi này, hoặc bỏ qua nếu màn hình đã đóng.

## "Failed to encode image" hoặc "Failed to render bitmap" {#render-failed}

Phía native không tạo được ảnh. Trên Android điều này xảy ra khi view chưa được layout (kích thước bằng 0). Hãy chắc chắn view đang hiển thị và có kích thước trước khi xuất ảnh.

## saveToPhotoLibrary {#photo-library}

- **App iOS bị tắt khi lưu.** `Info.plist` thiếu `NSPhotoLibraryAddUsageDescription`. iOS tắt app nào xin quyền ảnh mà không có key này.
- **Resolve với `granted: false` trên iOS.** Người dùng đã từ chối quyền trước đó. iOS sẽ không hỏi lại; hãy đưa người dùng tới Cài đặt bằng `Linking.openSettings()`.
- **Bị reject trên Android 9 trở xuống.** Ghi vào thư viện ảnh ở đó cần `WRITE_EXTERNAL_STORAGE`. Khai báo nó với `android:maxSdkVersion="28"` và xin quyền bằng `PermissionsAndroid` trước khi lưu.
- **PNG đã lưu có nền đen trong thư viện ảnh (Android).** PNG trong suốt khi không đặt `backgroundColor`, và một số app thư viện ảnh hiển thị phần trong suốt thành màu đen. Hãy đặt `backgroundColor` hoặc dùng `format: 'jpeg'`. Xem [Màu nền](/vi/guide/export#backgrounds).

## Ảnh xuất trên iOS và Android trông khác nhau {#exports-differ}

Phần lớn là do thiết kế. PNG trên iOS luôn trong suốt nhưng trên Android có `backgroundColor`, lề khi trim khác nhau, và đơn vị SVG là point trên iOS, pixel trên Android. Danh sách đầy đủ có ở [iOS và Android](/vi/guide/platform-differences#exports).

## Nét khôi phục bị sai màu {#restored-color}

Stroke data không lưu màu. `setStrokeData()` vẽ bằng `penColor` hiện tại (và trên Android là độ dày bút hiện tại). Hãy đặt các prop đó trước khi khôi phục. Xem [Khôi phục](/vi/guide/stroke-data#restoring).

## Nét vẽ biến mất sau khi replay bị ngắt {#replay-lost}

Nếu người dùng vẽ, hoặc bạn gọi `undo()`, `redo()`, `clear()` hay `setStrokeData()` trong lúc `replay()`, chỉ các nét đã hiện ra được giữ lại. Hãy lưu stroke data trước khi replay và khôi phục nếu cần. Xem [Khi bị ngắt](/vi/guide/stroke-data#interrupting).

## Undo trên Android hoạt động khác {#undo-android}

Trên Android, `undo()` chỉ gỡ nét vẽ: `clear()` không undo được, và sau `setStrokeData()` thì undo gỡ từng nét vừa khôi phục. iOS coi `clear()` và `setStrokeData()` là các bước có thể undo. Xem [Lịch sử](/vi/guide/methods#history).

## Loại mực không có tác dụng {#ink-type}

`defaultInkType` chỉ có trên iOS. `monoline`, `fountainPen`, `watercolor` và `crayon` cần iOS 17; phiên bản cũ hơn quay về `pen`.

## Lỗi build sau khi nâng cấp {#build-errors}

Native code được sinh từ TypeScript spec. Sau khi nâng cấp, hãy chạy `pod install` trong `ios/`, build lại app native, và trên Android chạy `./gradlew clean` nếu file sinh ra có vẻ cũ. Với Expo, chạy `npx expo prebuild --clean` rồi build lại. Expo Go không được hỗ trợ.

## Vẫn chưa xử lý được? {#still-stuck}

Hãy mở issue trên [GitHub](https://github.com/maitrungduc1410/react-native-signature-ink/issues) kèm phiên bản React Native, nền tảng, phiên bản hệ điều hành và một đoạn code tối giản. Chạy thử example app trong repository trước thường giúp biết vấn đề nằm ở thư viện hay ở layout xung quanh.
