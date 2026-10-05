---
description: "react-native-signature-ink 是什么：一个 Fabric 签名组件，iOS 上用 PencilKit 绘制，Android 上用速度贝塞尔渲染器绘制。"
---

# react-native-signature-ink 是什么？

`react-native-signature-ink` 是一个 React Native 签名板，它使用各平台自带的墨迹引擎绘制，而不是 JavaScript 画布、Skia 或 WebView。

- **iOS** 使用 [PencilKit](https://developer.apple.com/documentation/pencilkit)（`PKCanvasView`），也就是“备忘录”应用背后的引擎。压感、Apple Pencil 倾斜和 PencilKit 自带的平滑处理都无需额外配置。
- **Android** 使用经典速度贝塞尔签名算法的 Kotlin 移植版：笔画通过三次贝塞尔曲线平滑，笔速越快线条越细。墨迹绘制在离屏位图中，因此导出几乎是瞬间完成的。

你只需渲染一个组件 `<SignatureInk />`，并通过带类型的 ref 与它交互。

## 平台与架构 {#platforms-and-architecture}

| | 支持情况 |
| --- | --- |
| iOS | 支持（Swift，PencilKit） |
| Android | 支持（Kotlin），API 24+ |
| 新架构（Fabric） | 必需。组件是由 codegen 生成的 Fabric 视图。 |
| Expo | 支持开发构建和 `expo prebuild`，不支持 Expo Go。 |
| Web | 不支持。该包仅面向原生平台。 |

## 能做什么 {#what-you-can-do}

| 功能 | 文档 |
| --- | --- |
| 笔颜色、宽度范围、背景、签名基线 | [Props](/zh/guide/props) |
| 通过代码撤销、重做、清除、复制、回放、导出 | [Ref 方法](/zh/guide/methods) |
| 带自定义按钮和溢出菜单的原生工具栏 | [工具栏](/zh/guide/toolbar) |
| 响应笔画、内容变化、回放进度和工具栏点击 | [事件](/zh/guide/events) |
| PNG、JPEG、SVG、剪贴板、相册 | [导出格式](/zh/guide/export) |
| 保存并恢复笔画，重新播放动画 | [笔画数据与回放](/zh/guide/stroke-data) |
| 仅允许 Apple Pencil 或手写笔输入 | [Props](/zh/guide/props#input) |
| PencilKit 工具选择器和墨迹类型（iOS） | [Props](/zh/guide/props#ios-only) |

## 各部分如何协作 {#how-the-pieces-fit}

```text
<SignatureInk ref={ref} />          你的 props 和事件回调
        │
        ▼
SignatureInkView (Fabric codegen)   一个原生视图，没有原生模块
        │
        ├─ iOS：PKCanvasView、工具栏、基线、导出
        └─ Android：速度贝塞尔画布、工具栏、基线、导出
```

`toBase64()` 等 ref 方法以命令的形式发送给原生视图。结果通过一个内部事件返回，并 resolve 你正在 `await` 的 Promise，因此绘制期间不会阻塞 JS 线程。

## 两个组件 {#two-components}

- **`SignatureInk`** 是推荐使用的组件。它提供 ref API、Promise 形式的结果和易用的事件数据。
- **`SignatureInkView`** 是底层由 codegen 生成的原始组件。它使用原生端的 prop 名称，例如 `inkBackgroundColor` 和 `toolbarItemsJson`，并且没有 Promise API。只有在你想自己驱动视图时才使用它。详见 [API 参考](/api/variables/SignatureInkView)。

## 下一步 {#next-steps}

- [安装库](/zh/guide/installation)
- [五分钟添加签名板](/zh/guide/quick-start)
- [在浏览器中试用 props](/zh/guide/props#try-it)

## 致谢 {#credits}

Android 渲染器移植自 [gcacace/android-signaturepad](https://github.com/gcacace/android-signaturepad) 及其后继项目 [warting/android-signaturepad](https://github.com/warting/android-signaturepad)，它们采用了“Smoother Signatures”方法。
