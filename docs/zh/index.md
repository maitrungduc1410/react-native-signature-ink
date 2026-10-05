---
description: "React Native 原生签名组件：iOS 使用 PencilKit，Android 使用速度贝塞尔渲染器，内置原生工具栏，支持导出 PNG、JPEG 和 SVG。"
layout: home

hero:
  name: React Native Signature Ink
  text: 用平台自带的墨迹引擎书写签名
  tagline: iOS 使用 PencilKit，Android 使用精心调校的速度贝塞尔渲染器。一个 Fabric 组件，内置原生工具栏、类型完备的 ref API，可导出 PNG、JPEG、SVG 和笔画数据。不依赖 Skia，也不依赖 WebView。
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/quick-start
    - theme: alt
      text: 在浏览器中试用
      link: /zh/guide/props#try-it
    - theme: alt
      text: API 参考
      link: /api/

features:
  - icon: ✍️
    title: 真正的原生墨迹
    details: iOS 通过 PencilKit 绘制，支持压感和 Apple Pencil。Android 运行 Kotlin 编写的速度贝塞尔渲染器，笔速越快线条越细。
    link: /zh/guide/platform-differences
    linkText: iOS 与 Android 差异
  - icon: 🧰
    title: 内置工具栏
    details: 开箱即用的撤销、重做、清除和复制，支持自定义图标或文字按钮，空间不足时自动收进溢出菜单。
    link: /zh/guide/toolbar
    linkText: 工具栏
  - icon: 🖼️
    title: 完整的导出能力
    details: 以 base64 或文件形式导出 PNG、JPEG，也可导出 SVG、写入系统剪贴板或保存到相册，并可裁剪到签名区域。
    link: /zh/guide/export
    linkText: 导出格式
  - icon: 🔁
    title: 笔画数据与回放
    details: 将笔画保存为 JSON，稍后恢复，并以任意速度把签名重新播放为动画。
    link: /zh/guide/stroke-data
    linkText: 笔画数据
  - icon: ⚡
    title: Fabric 优先
    details: 基于新架构和 codegen 规范构建。绘制过程从不经过 JS 线程，视图在页面之间也能干净地复用。
    link: /zh/guide/performance
    linkText: 性能
  - icon: 📏
    title: 处处尺寸一致
    details: 所有宽度和偏移都以 pt 或 dp 为单位，因此签名在任意屏幕密度和两个平台上看起来都一样。
    link: /zh/guide/props
    linkText: Props
---

<div class="home-section vp-doc">

## 安装

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

然后在 `ios/` 中运行 `pod install`。该组件需要启用新架构。权限和 Expo 的相关说明见[安装](/zh/guide/installation)。

## 几行代码完成签名与导出

```tsx
import { useRef } from 'react';
import { SignatureInk, type SignatureInkHandle } from 'react-native-signature-ink';

const ref = useRef<SignatureInkHandle>(null);

<SignatureInk ref={ref} style={{ height: 240 }} showBaseline showToolbar />;

const png = await ref.current?.toBase64({ trim: true }); // 纯 base64，不带 data: 前缀
```

## 真机效果

<div class="demo-videos">
  <figure>
    <video src="https://github.com/user-attachments/assets/296cb656-5614-42d5-b42f-c7c9a656bccb" controls loop muted playsinline preload="metadata" aria-label="SignatureInk 在 iOS 上运行"></video>
    <figcaption>iOS</figcaption>
  </figure>
  <figure>
    <video src="https://github.com/user-attachments/assets/1378bb03-c111-41e8-82a4-8c0db8e5387f" controls loop muted playsinline preload="metadata" aria-label="SignatureInk 在 Android 上运行"></video>
    <figcaption>Android</figcaption>
  </figure>
</div>

</div>
