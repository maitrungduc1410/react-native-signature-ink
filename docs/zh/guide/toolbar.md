---
description: "配置 SignatureInk 原生工具栏：内置撤销、重做、清除和复制，自定义图标或文字按钮，着色以及溢出菜单。"
---

# 工具栏

设置 `showToolbar` 即可在视图内显示一排原生按钮。默认包含撤销、重做、清除和复制。

```tsx
<SignatureInk showToolbar style={{ height: 240 }} />
```

工具栏在视图的顶部或底部占用 `toolbarHeight`（iOS 为 44，Android 为 48），绘制区域会相应缩小。按钮靠末端对齐。如果你更想用自己的按钮，可以关闭工具栏并调用 [ref 方法](/zh/guide/methods)。

## 工具栏 props {#props}

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `showToolbar` | `boolean` | `false` | |
| `toolbarPosition` | `'top' \| 'bottom'` | `'bottom'` | |
| `toolbarButtons` | `ToolbarItem[]` | undo、redo、clear、copy | 保持传入顺序。 |
| `toolbarMaxVisibleButtons` | `number` | `0` | 直接显示的按钮数量上限。`0` 表示在宽度允许的范围内尽量多显示。 |
| `toolbarBackgroundColor` | `ColorValue` | `transparent` | |
| `toolbarTintColor` | `ColorValue` | 平台默认 | 图标和文字的颜色。见[颜色](#colors)。 |
| `toolbarHeight` | `number` | iOS：`44`，Android：`48` | 图标上下的间距为 `(toolbarHeight - 图标高度) / 2`。 |
| `toolbarIconSpacing` | `number` | `8` | 按钮之间的水平间距。 |

## 按钮 {#buttons}

`toolbarButtons` 中的每一项都是一个对象：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | `'undo'`、`'redo'`、`'clear'` 和 `'copy'` 会执行内置操作，其他 id 都是自定义按钮。 |
| `icon` | `ToolbarIconName` | `undo`、`redo`、`clear`、`copy`、`save`、`share`、`download`、`check` 之一。 |
| `text` | `string` | 文字标签，与图标同时设置时显示在图标之后。 |
| `tintColor` | `ColorValue` | 单个按钮的颜色，未设置时使用 `toolbarTintColor`。 |
| `accessibilityLabel` | `string` | 默认取 `text`，其次取 `id`。 |
| `disabled` | `boolean` | 变暗到 40% 且不可点击。 |

建议使用导出的常量而不是字符串字面量，以免拼写错误：

```tsx
import {
  SignatureInk,
  ToolbarAction,
  ToolbarIcon,
  DefaultToolbarItems,
} from 'react-native-signature-ink';

<SignatureInk
  showToolbar
  toolbarTintColor="#047857"
  toolbarButtons={[
    { id: ToolbarAction.Undo },                           // 默认图标
    { ...DefaultToolbarItems.clear, text: '清除' },       // 图标加文字
    { id: 'save', icon: ToolbarIcon.Save, text: '保存' }, // 自定义按钮
  ]}
  onToolbarAction={({ id }) => {
    if (id === 'save') save();
  }}
/>;
```

### 内置按钮 {#built-in-buttons}

既没有 `icon` 也没有 `text` 的内置按钮会使用默认图标。一旦设置了 `text`，就只显示你设置的内容，因此 `{ id: 'clear', text: '清除' }` 是一个纯文字按钮。如需在文字旁保留图标，请展开 `DefaultToolbarItems.clear`（或自行设置 `icon`）。

点击内置按钮时，先执行原生操作，再以该按钮的 id 触发 `onToolbarAction`。

### 自定义按钮 {#custom-buttons}

其他任何 `id` 都是自定义按钮。它没有原生行为：点击只会触发 `onToolbarAction({ id })`。TypeScript 要求自定义按钮至少设置 `icon` 或 `text` 之一。

id 应当唯一。两个相同 id 的按钮在 `onToolbarAction` 中无法区分；开发环境下组件检测到重复 id 时会输出警告。

### 图标 {#icons}

图标名称在 iOS 上对应 SF Symbols，在 Android 上对应随库附带、按同一套符号绘制的矢量图：

| `icon` | iOS SF Symbol |
| --- | --- |
| `undo` | `arrow.uturn.backward` |
| `redo` | `arrow.uturn.forward` |
| `clear` | `trash` |
| `copy` | `doc.on.doc` |
| `save` | `square.and.arrow.down` |
| `share` | `square.and.arrow.up` |
| `download` | `arrow.down.circle` |
| `check` | `checkmark` |

## 颜色 {#colors}

不设置 `toolbarTintColor` 时，两个平台的外观不同：

- **iOS** 使用视图的 tint color（除非应用修改过，否则为系统蓝）。
- **Android** 按每个图标自身的颜色绘制：undo、redo、clear 和 copy 为黑色，而 save、share、download、check 以及溢出按钮为**白色**。文字标签使用主题的按钮文字颜色。

因此在 Android 上，如果不设置着色，自定义图标和“…”按钮在浅色背景上是看不见的。只要使用了自定义图标或溢出菜单，就请设置 `toolbarTintColor`；在深色背景上请选择浅色。

## 溢出菜单 {#overflow}

按钮放不下时，多出的按钮会移入工具栏末端的“…”菜单。即使空间足够，`toolbarMaxVisibleButtons` 也会限制直接显示的按钮数量。

- 纯图标按钮占用 44 宽的位置；带文字的按钮按实际内容测量。
- **iOS 14+** 打开原生菜单，每项显示图标和标签；更早的 iOS 版本显示操作表。
- **Android** 打开只显示标签的 `PopupMenu`，并跟随浅色和深色模式。
- 菜单项使用按钮的 `accessibilityLabel`，默认取 `text`，其次取 `id`。因此一个只有 `{ id: 'undo' }` 的按钮在菜单中会显示为“undo”。对可能进入溢出菜单的按钮，请设置 `text` 或 `accessibilityLabel`。

溢出按钮的无障碍标签为“More”，目前没有本地化。

## 无障碍 {#accessibility}

图标按钮尺寸为 44×44，文字按钮高 44，满足常见的触控区域要求。每个按钮都会提供其 `accessibilityLabel`，`disabled` 的按钮会被报告为不可用。不传 `toolbarButtons` 时，默认按钮的标签为“Undo”“Redo”“Clear”和“Copy”。传入自定义列表时，标签取自 `accessibilityLabel`、`text` 或 `id`，因此请为内置按钮设置符合应用语言的易读标签。
