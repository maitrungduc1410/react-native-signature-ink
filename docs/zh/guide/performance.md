---
description: "SignatureInk 性能说明：各平台上哪些操作开销低、哪些开销高，大图导出、回放以及在列表中使用签名板。"
---

# 性能

绘制完全在原生端进行。触摸从不发送到 JavaScript，因此即使 JavaScript 线程繁忙，墨迹也能紧跟手指。剩下的开销集中在少数几个操作上。

## 书写过程中 {#while-drawing}

- **iOS**：由 PencilKit 渲染墨迹，无需调优。
- **Android**：每个触摸样本只把一小段贝塞尔曲线绘制到离屏位图，屏幕只是复制这张位图。长签名每帧的开销与短签名相同。

书写期间 JavaScript 唯一的工作是事件回调：`onBegin`、`onEnd` 和 `onChange`。请让它们保持轻量，尤其不要在每次 `onChange` 时导出图片，等用户确认后再导出。

## 开销较大的操作 {#costly-operations}

| 操作 | 开销来源 |
| --- | --- |
| 在 Android 上修改 `penColor` 或 `backgroundColor` | 重新分配位图并重绘所有笔画。修改笔宽的开销很小。 |
| Android 上的 `undo()` 和 `redo()` | 清空位图并重绘剩余的所有笔画。 |
| iOS 上的 `undo()`、`redo()`、`clear()`、`setStrokeData()` | 重建 PencilKit 画布，以保持其内部历史一致。 |
| Android 上的 `replay()` | 每一帧都重绘所有已显示的笔画。对签名没有问题，对上千个点的绘图会变慢。 |
| 在 Android 上改变视图尺寸 | 按新尺寸分配位图并重绘笔画。 |

对签名规模的内容（几十笔）来说，这些操作都很快。只有把视图当作通用画板绘制非常大的内容时，才会感觉到差异。

## 导出 {#exports}

- `toBase64()` 生成的字符串比图片大约三分之一，并一次性传到 JavaScript。在 3 倍屏上导出全屏 PNG 时可能达到数 MB。建议使用 `toFile()`，把 `file://` URI 交给上传代码。
- 使用 `trim: true` 只导出签名区域，通常比整个画布小得多。
- 不需要透明背景时，使用 `format: 'jpeg'` 并把 `quality` 设为 `0.8` 左右。
- `toSvg()` 和 `getStrokeData()` 体积小、速度快，它们不渲染像素。

## 列表 {#lists}

每个 `SignatureInk` 都持有一个原生画布（在 Android 上还有一张与视图同尺寸的位图）。一个页面放几个没有问题。对于长列表：

- 给 `FlatList` 传入 `removeClippedSubviews={false}`。以这种方式分离再重新挂载原生绘制视图并不可靠，在 Android 上尤其如此。
- 滚动到远处的行会被卸载并丢失内容。请保存每一行的笔画数据（例如在 `onEnd` 中调用 `getStrokeData()`），并在该行重新挂载时用 `setStrokeData()` 恢复。
- 对未在编辑的行，优先显示静态图片（来自 `toFile()`），只为用户正在签名的那一行挂载真正的签名板。

可运行的示例见仓库中 example 应用的 FlatList 页面。

## 回放 {#replay}

回放时长随点数增长（每点 4 ms，至少 0.5 s）。对于很长的内容，请传入更高的 `speed`，而不是让回放持续好几秒。
