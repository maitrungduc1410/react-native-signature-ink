---
description: "SignatureInk 在 iOS PencilKit 与 Android 自研渲染器之间的差异：墨迹、默认值、撤销历史、导出、笔画数据、工具栏和事件。"
---

# iOS 与 Android 差异

两个平台上的 JavaScript API 相同，但绘制引擎不同。iOS 把绘制交给 Apple 的 PencilKit。Android 使用自研视图，把每一笔绘制成贝塞尔曲线，线宽随手指速度变化。本页把所有差异集中在一起。

## 渲染 {#rendering}

| | iOS | Android |
| --- | --- | --- |
| 引擎 | PencilKit 的 `PKCanvasView` | 自研 `View`，绘制到离屏位图 |
| 线宽 | 由 PencilKit 根据压感和速度自行调整。工具宽度为 `penMinWidth` 与 `penMaxWidth` 的中点。 | `max(penMaxWidth / (velocity + 1), penMinWidth)`，速度单位为 dp/ms。慢则粗，快则细。 |
| `velocityFilterWeight` | 忽略 | 对样本之间的速度做平滑（默认 `0.7`） |
| `defaultInkType` | `pen`、`marker`、`pencil`；iOS 17+ 另有 `monoline`、`fountainPen`、`watercolor`、`crayon`（更早版本回退为 `pen`） | 忽略 |
| 手写笔 | Apple Pencil 的压感和倾斜会影响墨迹 | 与手指相同，`pencilOnly` 除外 |

### 为什么 Android 有自己的渲染器 {#why-android}

Android 没有可与 PencilKit 相比的系统墨迹引擎。Android 视图是签名板中常见的基于速度方法的原生移植：每个新的触摸样本都会用最近四个点构建一段三次贝塞尔曲线，线宽在每段曲线内从起点到终点逐渐变化。笔画绘制在位图中，所以继续书写时，已完成的笔画不需要重绘。

你可以在 [Props](/zh/guide/props#try-it) 页面试用同一算法的 JavaScript 版本。

## 默认值 {#defaults}

| Prop | iOS | Android |
| --- | --- | --- |
| `penColor` | `black` | `#111111` |
| `toolbarHeight` | `44` | `48` |
| `toolbarTintColor` | 视图的 tint color（系统蓝） | 各图标自身的颜色。见[工具栏颜色](/zh/guide/toolbar#colors)。 |
| `baselineColor` | 50% 不透明度的系统灰 | `#80808080` |
| `baselineOffsetFromBottom` | `8` | `16` |
| `baselineStyle="dotted"` 时的 `baselineWidth` | `1.5` | `2` |

如果希望两个平台外观一致，请显式设置这些 props。

## 历史记录 {#history}

| | iOS | Android |
| --- | --- | --- |
| `undo()` 撤销的对象 | 最后一笔、`clear()` 或 `setStrokeData()` | 最后一笔 |
| `clear()` | 可以撤销 | 不能撤销，并且会清空重做栈 |
| `setStrokeData()` | 可以撤销 | 之前的内容会丢失；`undo()` 会逐笔移除恢复的笔画 |
| 新的一笔 | 清空重做栈 | 清空重做栈 |

## 导出 {#exports}

| | iOS | Android |
| --- | --- | --- |
| PNG 背景 | 始终透明 | 设置了 `backgroundColor` 则包含 |
| `saveToPhotoLibrary` 的 PNG | 不透明，未设置 `backgroundColor` 时为白色 | 设置了 `backgroundColor` 则包含，否则透明 |
| 剪贴板 | 通过 `UIPasteboard` 写入透明的裁剪 PNG | 通过 `FileProvider` URI 写入带背景的裁剪 PNG |
| `trim` 边距 | 2 pt | 0.6 × `penMaxWidth` dp + 2 px |
| SVG 单位与线宽 | pt，每笔取平均宽度 | 物理像素，`(penMinWidth + penMaxWidth) / 2` |
| `toFile` 位置 | 临时目录 | 缓存目录 |
| `saveToPhotoLibrary` 结果 | `{ granted }`；拒绝访问时 `granted: false` | `{ granted, uri }`；写入失败时 `granted: false` |

详见[导出格式](/zh/guide/export)。

## 笔画数据 {#stroke-data}

| | iOS | Android |
| --- | --- | --- |
| 坐标 | pt | dp |
| `t` | 自这一笔开始以来的秒数 | 系统开机时长，单位毫秒 |
| 额外字段 | `pressure`、`size`、`azimuth`、`altitude` | 无 |
| 恢复时的宽度 | 每个点的 `size` | 当前的 `penMinWidth` 和 `penMaxWidth` |

详见[笔画数据与回放](/zh/guide/stroke-data)。

## 输入 {#input}

| | iOS | Android |
| --- | --- | --- |
| `pencilOnly` | PencilKit 的 `drawingPolicy`（iOS 14+），忽略手指。 | 只有 `TOOL_TYPE_STYLUS` 能绘制，手指和手写笔橡皮擦端都会被忽略。 |
| 在 `ScrollView` 中 | 无额外处理 | 一笔开始后，视图会要求父视图不要拦截触摸 |
| 压感 | PencilKit 会使用 | 不使用，线宽只取决于速度 |
| `showToolPicker` | 显示 PencilKit 工具选择器 | 忽略 |

## 工具栏 {#toolbar}

| | iOS | Android |
| --- | --- | --- |
| 图标 | SF Symbols | 随库附带的同风格矢量图 |
| 溢出菜单 | 带图标的原生菜单（iOS 14+），更早版本为操作表 | 只显示标签的 `PopupMenu` |

## 事件 {#events}

| | iOS | Android |
| --- | --- | --- |
| 每一笔的 `onChange` | 可能触发多次 | 一次 |
| `onChange` 与 `onEnd` 的顺序 | 先 `onEnd` | 先 `onChange` |
| 渲染错误信息 | `Failed to encode image` | `Failed to render bitmap` |
