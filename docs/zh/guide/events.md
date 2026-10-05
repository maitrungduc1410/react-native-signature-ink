---
description: "SignatureInk 的 onBegin、onEnd、onChange、onReplayProgress 和 onToolbarAction 事件，以及各自的数据和触发时机。"
---

# 事件

所有事件都是 `<SignatureInk />` 上普通的回调 prop。

| Prop | 数据 | 触发时机 |
| --- | --- | --- |
| `onBegin` | 无 | 手指或笔按下，一笔开始。 |
| `onEnd` | 无 | 手指或笔抬起，这一笔被提交。 |
| `onChange` | `{ isEmpty, strokeCount }` | 绘制内容发生变化。 |
| `onReplayProgress` | `{ progress }` | `replay()` 运行期间的每一帧。 |
| `onToolbarAction` | `{ id }` | 点击工具栏按钮或溢出菜单项。 |

## onBegin 与 onEnd {#onbegin-onend}

```tsx
<SignatureInk
  onBegin={() => setHint(null)}
  onEnd={() => saveDraft()}
/>
```

`onBegin` 只会为允许绘制的输入触发，因此开启 [`pencilOnly`](/zh/guide/props#input) 后，手指触摸不会触发它。`onEnd` 触发时，这一笔已经成为绘制内容的一部分，所以 `getStrokeData()` 和各导出方法都会包含它。

## onChange {#onchange}

```tsx
<SignatureInk onChange={({ isEmpty, strokeCount }) => setSigned(!isEmpty)} />
```

`onChange` 会在一笔结束后触发，也会在 `undo()`、`redo()`、`clear()` 和 `setStrokeData()` 之后触发，包括通过工具栏执行的相同操作。回放的每一帧不会触发它。

请把它理解为“内容可能变了”，读取数据本身，而不要统计调用次数：

- 在 iOS 上，同一笔可能触发不止一次。
- 与 `onEnd` 的先后顺序不同：Android 先触发 `onChange` 再触发 `onEnd`，iOS 则相反。
- 即使画布本来就是空的，`clear()` 也会触发它。

`onChange` 是启用或禁用“保存”按钮成本最低的方式。需要时也可以用 `isEmpty()` 以 Promise 的形式获得同样的结果。

## onReplayProgress {#onreplayprogress}

```tsx
<SignatureInk onReplayProgress={({ progress }) => setProgress(progress)} />
```

`progress` 在回放时长内从 0 增长到 1。它在每个显示帧都会触发，因此不要在回调中做繁重的工作。完整播放的回放最后一定会报告 `1`；被打断的回放（新的一笔、再次调用 `replay()`、`undo()`、`redo()`、`clear()` 或 `setStrokeData()`）会直接停止，不会到达 `1`。

## onToolbarAction {#ontoolbaraction}

```tsx
<SignatureInk
  showToolbar
  toolbarButtons={[{ id: 'undo' }, { id: 'save', icon: 'save', text: '保存' }]}
  onToolbarAction={({ id }) => {
    if (id === 'save') save();
  }}
/>
```

`id` 是被点击项的 `id`。对于内置 id（`undo`、`redo`、`clear`、`copy`），回调触发时原生操作已经执行完毕。自定义 id 没有原生行为，需要在这个回调中处理。点击溢出菜单中的项同样会触发它。

数据中还有一个值相同的 `action` 字段，它已被弃用，请使用 `id`。

## 原生端的名称 {#native-names}

如果直接使用原始的 `SignatureInkView`，内容变化事件名为 `onStrokesChange`（因为 React Native 核心已经为 `TextInput` 和 `Switch` 注册了 `topChange`），工具栏数据为 `{ itemId, action }`，Promise 结果则通过内部的 `onResult` 事件返回。`SignatureInk` 会把这些都转换成上面的 props。
