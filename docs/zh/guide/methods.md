---
description: "SignatureInk 的 ref API：clear、undo、redo、copy、replay、笔画数据和基于 Promise 的导出，以及调用时机、历史和错误规则。"
---

# Ref 方法

给组件绑定一个类型为 `SignatureInkHandle` 的 ref，即可调用原生视图上的方法。

```tsx
import { useRef } from 'react';
import { SignatureInk, type SignatureInkHandle } from 'react-native-signature-ink';

const ref = useRef<SignatureInkHandle>(null);

<SignatureInk ref={ref} style={{ height: 240 }} />;

ref.current?.undo();
const empty = await ref.current?.isEmpty();
```

## 概览 {#overview}

| 方法 | 返回值 | 作用 |
| --- | --- | --- |
| `clear()` | `void` | 移除所有笔画。 |
| `undo()` | `void` | 后退一条历史记录。 |
| `redo()` | `void` | 重新应用最近撤销的记录。 |
| `copyToClipboard()` | `void` | 把裁剪后的 PNG 放入系统剪贴板。 |
| `replay(options?)` | `void` | 以动画形式重新播放笔画。 |
| `setStrokeData(data)` | `void` | 用保存的笔画替换当前内容。 |
| `isEmpty()` | `Promise<boolean>` | 没有笔画时为 `true`。 |
| `toBase64(options?)` | `Promise<string>` | 纯 base64 格式的 PNG 或 JPEG。 |
| `toFile(options?)` | `Promise<string>` | 写入文件的 PNG 或 JPEG，返回 `file://` URI。 |
| `toSvg()` | `Promise<string>` | 一个 SVG 文档。 |
| `getStrokeData()` | `Promise<StrokeData>` | 可直接 JSON 序列化的笔画数据。 |
| `saveToPhotoLibrary(options?)` | `Promise<SavedToPhotoLibraryResult>` | 把图片保存到“照片”或相册。 |

导出方法见[导出格式](/zh/guide/export)，`getStrokeData`、`setStrokeData` 和 `replay` 见[笔画数据与回放](/zh/guide/stroke-data)。

## 撤销、重做与清除 {#history}

两个平台的历史模型并不相同：

| | iOS | Android |
| --- | --- | --- |
| `undo()` 撤销的对象 | 最后一笔、`clear()` 或 `setStrokeData()` | 最后一笔 |
| `clear()` | 可以撤销 | 不能撤销，并且会清空重做栈 |
| `setStrokeData()` | 可以撤销 | 之前的内容会丢失；`undo()` 会逐笔移除恢复的笔画 |
| 新的一笔 | 清空重做栈 | 清空重做栈 |

没有可撤销或可重做的内容时，`undo()` 和 `redo()` 不做任何事。如果需要两个平台行为一致，例如一个可撤销的“清除”按钮，请在清除前用 `getStrokeData()` 保存一份副本，再用 `setStrokeData()` 恢复。

## 回放 {#replay}

```tsx
ref.current?.replay();               // 自然速度
ref.current?.replay({ speed: 2 });   // 两倍速
```

基础时长约为每个采样点 4 ms，最少 0.5 s，再除以 `speed`。`speed` 默认为 `1`，最小为 `0.05`。在空画布上调用 `replay()` 不会有任何效果。详见[笔画数据与回放](/zh/guide/stroke-data#replay)。

## 方法的执行时机 {#timing}

- 返回 `void` 的方法在原生视图挂载前调用时不做任何事。
- 返回 Promise 的方法在挂载前调用时会以 `SignatureInk: native view is not mounted yet` reject。
- 如果组件在 Promise 尚未完成时卸载，会以 `SignatureInk unmounted` reject。
- 原生端失败时会以原生错误信息 reject，例如 `Failed to encode image`（iOS）或 `Failed to render bitmap`（Android，视图尚未完成布局时）。

因此请用 `try`/`catch` 包裹导出调用，尤其是在列表中，因为行随时可能被卸载：

```tsx
try {
  const uri = await ref.current?.toFile({ format: 'jpeg', quality: 0.9 });
} catch (e) {
  // 视图已卸载或导出失败
}
```

## 工具栏按钮调用同一套代码 {#toolbar-buttons}

点击内置的撤销、重做、清除或复制按钮，执行的原生代码与对应的 ref 方法完全相同，随后触发 [`onToolbarAction`](/zh/guide/events#ontoolbaraction)。
