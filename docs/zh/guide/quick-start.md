---
description: "在 React Native 页面中添加带基线和工具栏的原生签名板，判断用户是否已签名，并将签名导出为裁剪后的 PNG 图片。"
---

# 快速开始

本页将搭建一个简单的签名页面：带基线和内置工具栏的签名板、一个仅在有签名后才可点击的“保存”按钮，以及 PNG 导出。

## 1. 渲染签名板 {#render-the-pad}

`SignatureInk` 没有固有尺寸，请通过 `style` 为它设置高度（或 `flex: 1`）。

```tsx
import { useRef, useState } from 'react';
import { Button, View } from 'react-native';
import { SignatureInk, type SignatureInkHandle } from 'react-native-signature-ink';

export function SignScreen() {
  const ref = useRef<SignatureInkHandle>(null);
  const [signed, setSigned] = useState(false);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <SignatureInk
        ref={ref}
        style={{ height: 240 }}
        showBaseline
        showToolbar
        penColor="#111111"
        onChange={(e) => setSigned(!e.isEmpty)}
      />
      <Button title="保存" disabled={!signed} onPress={save} />
    </View>
  );

  async function save() {
    // 见第 2 步
  }
}
```

- `showBaseline` 绘制虚线签名基线。
- `showToolbar` 添加原生的撤销、重做、清除和复制按钮。详见[工具栏](/zh/guide/toolbar)。
- 每当绘制内容变化时都会触发 `onChange`，并附带 `{ isEmpty, strokeCount }`。详见[事件](/zh/guide/events)。

## 2. 导出签名 {#export-the-signature}

所有导出方法都在 ref 上，并返回 Promise。

```tsx
async function save() {
  const base64 = await ref.current?.toBase64({ format: 'png', trim: true });
  if (!base64) return;
  await upload(`data:image/png;base64,${base64}`); // 你自己的上传逻辑
}
```

`toBase64()` 返回不带 `data:` 前缀的纯 base64 数据。`trim: true` 会把图片裁剪到签名区域，而不是整个画布。对于大图，[`toFile()`](/zh/guide/export#file) 可以避免把一长串字符串传到 JavaScript。

## 3. 使用自己的按钮 {#use-your-own-buttons}

去掉 `showToolbar`，在你自己的 UI 中调用 ref 方法：

```tsx
<View style={{ flexDirection: 'row', gap: 8 }}>
  <Button title="撤销" onPress={() => ref.current?.undo()} />
  <Button title="清除" onPress={() => ref.current?.clear()} />
</View>
```

完整列表见 [Ref 方法](/zh/guide/methods)。

## 4. 深色背景 {#dark-backgrounds}

画布默认透明，会透出父视图的背景。在深色页面上，请使用浅色的笔和浅色的工具栏着色：

```tsx
<SignatureInk
  backgroundColor="#0c0c0c"
  penColor="#ffffff"
  baselineColor="rgba(255,255,255,0.4)"
  toolbarTintColor="#ffffff"
  showBaseline
  showToolbar
/>
```

在 iOS 上，墨迹颜色会按原样使用；无论在屏幕上还是导出时，PencilKit 都不会在深色模式下反转颜色。

## 下一步 {#next-steps}

- [所有 props，附实时预览](/zh/guide/props)
- [导出格式](/zh/guide/export)
- [保存和恢复笔画](/zh/guide/stroke-data)
