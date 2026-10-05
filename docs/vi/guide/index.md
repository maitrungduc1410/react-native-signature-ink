---
description: "react-native-signature-ink là gì: một Fabric component chữ ký vẽ bằng PencilKit trên iOS và renderer velocity-Bezier trên Android."
---

# react-native-signature-ink là gì?

`react-native-signature-ink` là bảng ký tên cho React Native, vẽ bằng chính engine mực của từng nền tảng thay vì canvas JavaScript, Skia hay WebView.

- **iOS** dùng [PencilKit](https://developer.apple.com/documentation/pencilkit) (`PKCanvasView`), engine đứng sau ứng dụng Ghi chú. Bạn có sẵn lực nhấn, độ nghiêng Apple Pencil và thuật toán làm mượt của PencilKit.
- **Android** dùng bản port Kotlin của thuật toán chữ ký velocity-Bezier quen thuộc: nét vẽ được làm mượt bằng đường cong Bezier bậc ba và mảnh dần khi bút đi nhanh hơn. Mực được vẽ vào một bitmap offscreen nên xuất ảnh gần như tức thì.

Bạn chỉ render một component, `<SignatureInk />`, và điều khiển nó qua một ref có type.

## Nền tảng và kiến trúc {#platforms-and-architecture}

| | Hỗ trợ |
| --- | --- |
| iOS | Có (Swift, PencilKit) |
| Android | Có (Kotlin), API 24+ |
| New Architecture (Fabric) | Bắt buộc. Component là một Fabric view sinh bằng codegen. |
| Expo | Development build và `expo prebuild`. Không chạy trên Expo Go. |
| Web | Không. Package chỉ dành cho native. |

## Bạn làm được gì {#what-you-can-do}

| Tính năng | Ở đâu |
| --- | --- |
| Màu bút, khoảng độ dày, nền, đường kẻ ký tên | [Props](/vi/guide/props) |
| Undo, redo, xoá, copy, replay, xuất ảnh từ code | [Phương thức qua ref](/vi/guide/methods) |
| Toolbar native với nút tuỳ chỉnh và menu overflow | [Toolbar](/vi/guide/toolbar) |
| Bắt sự kiện nét vẽ, thay đổi, tiến độ replay và lần chạm toolbar | [Sự kiện](/vi/guide/events) |
| PNG, JPEG, SVG, clipboard, thư viện ảnh | [Định dạng xuất](/vi/guide/export) |
| Lưu và khôi phục nét vẽ, phát lại animation | [Dữ liệu nét vẽ và replay](/vi/guide/stroke-data) |
| Chỉ nhận Apple Pencil hoặc bút stylus | [Props](/vi/guide/props#input) |
| Tool picker và loại mực PencilKit (iOS) | [Props](/vi/guide/props#ios-only) |

## Các phần ghép với nhau thế nào {#how-the-pieces-fit}

```text
<SignatureInk ref={ref} />          props và callback của bạn
        │
        ▼
SignatureInkView (Fabric codegen)   một native view, không có native module
        │
        ├─ iOS: PKCanvasView, toolbar, baseline, xuất ảnh
        └─ Android: canvas velocity-Bezier, toolbar, baseline, xuất ảnh
```

Các phương thức qua ref như `toBase64()` được gửi xuống native view dưới dạng command. Kết quả trả về qua một sự kiện nội bộ duy nhất và resolve Promise bạn đang `await`, nên không có gì chặn JS thread trong lúc bạn vẽ.

## Hai component {#two-components}

- **`SignatureInk`** là component bạn nên dùng. Nó cung cấp ref API, kết quả dạng Promise và payload sự kiện dễ dùng.
- **`SignatureInkView`** là component codegen thô bên dưới. Nó nhận tên prop phía native như `inkBackgroundColor` và `toolbarItemsJson` và không có Promise API. Chỉ dùng khi bạn muốn tự điều khiển view. Xem [API reference](/api/variables/SignatureInkView).

## Bước tiếp theo {#next-steps}

- [Cài đặt thư viện](/vi/guide/installation)
- [Thêm bảng ký tên trong năm phút](/vi/guide/quick-start)
- [Thử các props ngay trên trình duyệt](/vi/guide/props#try-it)

## Ghi công {#credits}

Renderer Android là bản port của [gcacace/android-signaturepad](https://github.com/gcacace/android-signaturepad) và phiên bản kế nhiệm [warting/android-signaturepad](https://github.com/warting/android-signaturepad), vốn dùng cách tiếp cận "Smoother Signatures".
