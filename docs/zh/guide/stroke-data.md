---
description: "用 getStrokeData 和 setStrokeData 保存和恢复签名笔画，了解各平台的点格式，并通过 replay 播放动画。"
---

# 笔画数据与回放

图片是最终产物，笔画数据则是绘制内容本身：一组笔画，每一笔是一组点。可以用它保存草稿、在重新挂载后恢复签名，或通过 `replay()` 播放动画。

```tsx
const data = await ref.current?.getStrokeData(); // StrokeData
await AsyncStorage.setItem('draft', JSON.stringify(data));

// 之后
const saved = await AsyncStorage.getItem('draft');
if (saved) ref.current?.setStrokeData(JSON.parse(saved));
```

## 格式 {#format}

```ts
type StrokeData = StrokePoint[][];

interface StrokePoint {
  x: number;
  y: number;
  t: number;
  pressure?: number; // 仅 iOS
  size?: number;     // 仅 iOS
  azimuth?: number;  // 仅 iOS
  altitude?: number; // 仅 iOS
}
```

空画布返回 `[]`。各字段在两个平台上的含义略有不同：

| 字段 | iOS | Android |
| --- | --- | --- |
| `x`、`y` | pt，取自 PencilKit 笔画的控制点 | dp（由像素换算），取自采集到的触摸样本 |
| `t` | 自这一笔开始以来的秒数 | 系统开机时长，单位毫秒 |
| `pressure` | PencilKit 报告的触摸力度 | 不提供 |
| `size` | 该点的墨迹宽度 | 不提供 |
| `azimuth`、`altitude` | Apple Pencil 的角度，单位为弧度 | 不提供 |

由于 pt 和 dp 都与屏幕密度无关，在一台设备上保存的内容在另一台同尺寸设备上会完全对齐。数据也可以跨平台使用，但效果不会完全相同：iOS 用 `size` 作为宽度，Android 则根据点之间的时间间隔重新计算宽度。

只在同一笔内比较 `t` 值，绝对数值没有意义。

## 恢复 {#restoring}

`setStrokeData(data)` 会替换画布上的全部内容并触发 `onChange`。有些信息不保存在数据中，而是取自当前的 props：

- **颜色。** 两个平台上恢复的笔画都使用当前的 `penColor`。
- **Android 上的宽度。** 使用当前的 `penMinWidth` 和 `penMaxWidth`。iOS 使用每个点的 `size`，缺失时使用 `penMaxWidth`。
- **iOS 上的墨迹类型。** 使用当前的 `defaultInkType`。

未知字段会被忽略，因此你可以加入自己的元数据。如果传入的值无法解析为笔画数据，调用会被忽略，画布保持原样。该方法没有返回值，因此也没有可捕获的错误。

它与撤销的交互因平台而异，见[历史记录](/zh/guide/methods#history)。

## 回放 {#replay}

```tsx
ref.current?.replay({ speed: 1.5 });
```

`replay()` 会清空视图，然后按顺序逐点重绘当前的笔画。它不会改变绘制内容或撤销历史，笔画保持原来的颜色。

- **时长**：`max(0.5 s, 4 ms × 点数) / speed`。`speed` 默认为 `1`，最小为 `0.05`。
- **节奏**：点以恒定速率出现。不会使用记录的 `t` 值，因此原始书写中的停顿不会被还原。
- **进度**：[`onReplayProgress`](/zh/guide/events#onreplayprogress) 在每一帧报告 0 到 1 的进度。
- **空画布**：什么也不会发生，也不会报告进度。

### 被打断时 {#interrupting}

新的一笔、再次调用 `replay()`、`undo()`、`redo()`、`clear()` 或 `setStrokeData()` 都会停止动画。此时画布只保留停止时已经显示出来的笔画，其余部分不会恢复。如果允许用户在回放期间书写，请先保存数据：

```tsx
const data = await ref.current?.getStrokeData();
ref.current?.replay();
// 如果回放被打断，想找回完整内容：
ref.current?.setStrokeData(data ?? []);
```

回放期间卸载视图会干净地停止回放。
