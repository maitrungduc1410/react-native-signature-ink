---
description: "SignatureInk 全部 props 及各平台默认值：笔颜色与宽度、背景、基线、仅手写笔输入以及 iOS PencilKit 选项。"
---

# Props

所有 props 都是可选的。尺寸、宽度和偏移都与屏幕密度无关：iOS 上为 pt，Android 上为 dp。同一个数值在任何屏幕和两个平台上都对应相同的物理尺寸。

## 在线试用 {#try-it}

在签名板上书写并调整 props。墨迹使用 Android 渲染器的 JavaScript 移植版，因此效果接近 Android 真机；iOS 上的 PencilKit 看起来会略有不同（见 [iOS 与 Android 差异](/zh/guide/platform-differences)）。对应的 JSX 位于底部。

<SignaturePad />

## 布局 {#layout}

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `style` | `StyleProp<ViewStyle>` | | 视图没有固有尺寸，请设置 `height` 或 `flex`。 |

## 笔 {#pen}

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `penColor` | `ColorValue` | iOS：黑色，Android：`#111111` | 只作用于新笔画，已有笔画保持原色。 |
| `penMinWidth` | `number` | `1` | 最细线宽，笔速快时达到。 |
| `penMaxWidth` | `number` | `3` | 最粗线宽，笔速慢时使用。 |
| `velocityFilterWeight` | `number` | `0.7` | 仅 Android。限制在 0 到 1 之间。 |

宽度范围的使用方式因平台而异：

- **Android** 按 `max(penMaxWidth / (velocity + 1), penMinWidth)` 计算每段曲线的宽度，速度单位为 dp/ms。`velocityFilterWeight` 是指数滤波中最新速度样本的权重：值越高反应越快，值越低线条粗细过渡越平滑、越缓慢。
- **iOS** 只向 PencilKit 传入一个工具宽度，即两个值的中点（默认为 `2`），再由 PencilKit 根据压感和速度自行调整线条。`velocityFilterWeight` 会被忽略。

在 iOS 上，墨迹颜色会按原样使用。无论在屏幕上还是导出时，深色模式都不会反转它，因此请传入 `'#111'` 或 `'white'` 这样的具体颜色，而不是会自动适配的系统颜色。

## 画布 {#canvas}

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `backgroundColor` | `ColorValue` | `transparent` | 画布填充色。使用默认值时会透出父视图。 |

`backgroundColor` 是 prop 而不是 style 中的键，因为它还会影响导出：JPEG 和保存到相册的图片会合成到这个颜色上（透明时合成到白色上），在 Android 上 PNG 导出也会包含它。详见[导出格式](/zh/guide/export#backgrounds)。

## 基线 {#baseline}

签名基线距左右边缘各 16 个单位，永远不会出现在导出的图片中。

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `showBaseline` | `boolean` | `false` | |
| `baselineColor` | `ColorValue` | 50% 灰色 | iOS：50% 不透明度的 `systemGray`。Android：`#80808080`。 |
| `baselineStyle` | `'solid' \| 'dashed' \| 'dotted'` | `'dashed'` | 未知值会回退为 `'dashed'`。 |
| `baselineWidth` | `number` | `0` | `0` 表示自动：solid 和 dashed 为 `1`，dotted 略粗（iOS `1.5`，Android `2`）。 |
| `baselineOffsetFromBottom` | `number` | iOS：`8`，Android：`16` | 距绘制区域底部的距离。显示工具栏时会被忽略。 |

[工具栏](/zh/guide/toolbar)可见时，基线位于绘制区域与工具栏的交界处，这样图标周围的间距保持均匀，把工具栏移到顶部时基线也不会跳动。

## 输入 {#input}

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `pencilOnly` | `boolean` | `false` | 只接受手写笔输入。 |

- **iOS** 设置 `PKCanvasViewDrawingPolicy.pencilOnly`：只有 Apple Pencil 可以绘制，手指触摸会被忽略。drawing policy 需要 iOS 14 或更高版本。
- **Android** 会忽略指针类型不是 `MotionEvent.TOOL_TYPE_STYLUS` 的所有触摸。手写笔的橡皮擦端报告的是另一种工具类型，因此也会被忽略。

## 工具栏 {#toolbar}

| Prop | 类型 | 默认值 |
| --- | --- | --- |
| `showToolbar` | `boolean` | `false` |
| `toolbarPosition` | `'top' \| 'bottom'` | `'bottom'` |
| `toolbarButtons` | `ToolbarItem[]` | undo、redo、clear、copy |
| `toolbarMaxVisibleButtons` | `number` | `0`（按宽度自适应） |
| `toolbarBackgroundColor` | `ColorValue` | `transparent` |
| `toolbarTintColor` | `ColorValue` | 见[工具栏](/zh/guide/toolbar#colors) |
| `toolbarHeight` | `number` | iOS：`44`，Android：`48` |
| `toolbarIconSpacing` | `number` | `8` |

详细说明、自定义按钮和溢出菜单见[工具栏](/zh/guide/toolbar)页面。

## 仅 iOS {#ios-only}

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `showToolPicker` | `boolean` | `false` | 显示系统的 PencilKit 工具选择器。 |
| `defaultInkType` | `InkType` | `'pen'` | PencilKit 的初始墨迹类型。 |

Android 会忽略这两个 prop。

`defaultInkType` 在所有 iOS 版本上都支持 `'pen'`、`'pencil'` 和 `'marker'`。`'monoline'`、`'fountainPen'`、`'watercolor'` 和 `'crayon'` 需要 iOS 17；在更早的版本上会回退为 `'pen'`。

```tsx
<SignatureInk showToolPicker defaultInkType="fountainPen" />
```

开启 `showToolPicker` 后，用户可以更改墨迹类型、颜色和宽度，也可以切换到橡皮擦。选择器会遮住屏幕底部（iPhone 上约 220 pt），请在布局中预留空间。视图离开窗口时选择器会被移除，因此不会停留在下一个页面上方。深色模式下选中的颜色会保持其在浅色模式下的样子，与 `penColor` 的行为一致。

## 事件 {#events}

`onBegin`、`onEnd`、`onChange`、`onReplayProgress` 和 `onToolbarAction` 见[事件](/zh/guide/events)页面。
