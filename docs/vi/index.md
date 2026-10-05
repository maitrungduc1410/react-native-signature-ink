---
description: "Component chữ ký native cho React Native: PencilKit trên iOS, renderer velocity-Bezier trên Android, toolbar native và xuất PNG, JPEG, SVG."
layout: home

hero:
  name: React Native Signature Ink
  text: Chữ ký vẽ bằng chính engine mực của nền tảng
  tagline: PencilKit trên iOS, renderer velocity-Bezier tinh chỉnh kỹ trên Android. Một Fabric component với toolbar native, ref API có type đầy đủ và xuất PNG, JPEG, SVG, stroke data. Không Skia, không WebView.
  actions:
    - theme: brand
      text: Bắt đầu
      link: /vi/guide/quick-start
    - theme: alt
      text: Thử ngay trên trình duyệt
      link: /vi/guide/props#try-it
    - theme: alt
      text: API reference
      link: /api/

features:
  - icon: ✍️
    title: Mực native thật sự
    details: iOS vẽ bằng PencilKit, hỗ trợ lực nhấn và Apple Pencil. Android chạy renderer velocity-Bezier viết bằng Kotlin, nét mảnh dần khi bút di chuyển nhanh.
    link: /vi/guide/platform-differences
    linkText: iOS và Android
  - icon: 🧰
    title: Toolbar có sẵn
    details: Undo, redo, xoá và copy dùng được ngay, thêm nút tuỳ chỉnh bằng icon hoặc chữ và menu overflow tự động.
    link: /vi/guide/toolbar
    linkText: Toolbar
  - icon: 🖼️
    title: Xuất ảnh đủ định dạng
    details: PNG hoặc JPEG dạng base64 hoặc file, SVG, clipboard hệ thống và thư viện ảnh, có thể cắt sát vùng chữ ký.
    link: /vi/guide/export
    linkText: Định dạng xuất
  - icon: 🔁
    title: Stroke data và replay
    details: Lưu nét vẽ dưới dạng JSON, khôi phục lại sau và phát lại chữ ký thành animation với tốc độ tuỳ ý.
    link: /vi/guide/stroke-data
    linkText: Stroke data
  - icon: ⚡
    title: Ưu tiên Fabric
    details: Xây trên New Architecture với codegen spec. Việc vẽ không bao giờ đi qua JS thread, và view được tái sử dụng gọn gàng giữa các màn hình.
    link: /vi/guide/performance
    linkText: Hiệu năng
  - icon: 📏
    title: Kích thước như nhau ở mọi nơi
    details: Mọi độ dày và khoảng cách đều tính bằng point hoặc dp, nên chữ ký trông giống nhau trên mọi mật độ màn hình và trên cả hai nền tảng.
    link: /vi/guide/props
    linkText: Props
---

<div class="home-section vp-doc">

## Cài đặt

::: code-group

```sh [npm]
npm install react-native-signature-ink
```

```sh [yarn]
yarn add react-native-signature-ink
```

```sh [Expo]
npx expo install react-native-signature-ink
npx expo prebuild
```

:::

Sau đó chạy `pod install` trong `ios/`. Component cần New Architecture. Xem [Cài đặt](/vi/guide/installation) để biết về quyền truy cập và Expo.

## Ký và xuất ảnh chỉ với vài dòng

```tsx
import { useRef } from 'react';
import { SignatureInk, type SignatureInkHandle } from 'react-native-signature-ink';

const ref = useRef<SignatureInkHandle>(null);

<SignatureInk ref={ref} style={{ height: 240 }} showBaseline showToolbar />;

const png = await ref.current?.toBase64({ trim: true }); // base64 thuần, không có tiền tố data:
```

## Xem trên thiết bị thật

<div class="demo-videos">
  <figure>
    <video src="https://github.com/user-attachments/assets/296cb656-5614-42d5-b42f-c7c9a656bccb" controls loop muted playsinline preload="metadata" aria-label="SignatureInk chạy trên iOS"></video>
    <figcaption>iOS</figcaption>
  </figure>
  <figure>
    <video src="https://github.com/user-attachments/assets/1378bb03-c111-41e8-82a4-8c0db8e5387f" controls loop muted playsinline preload="metadata" aria-label="SignatureInk chạy trên Android"></video>
    <figcaption>Android</figcaption>
  </figure>
</div>

</div>
