---
description: "将签名导出为 base64 或文件形式的 PNG、JPEG，导出 SVG，写入剪贴板或保存到相册，以及裁剪、质量和背景规则。"
---

# 导出格式

| 方法 | 输出 | trim 默认值 |
| --- | --- | --- |
| [`toBase64(options?)`](#base64) | PNG 或 JPEG，纯 base64 字符串 | `false` |
| [`toFile(options?)`](#file) | PNG 或 JPEG 文件，`file://` URI | `false` |
| [`toSvg()`](#svg) | SVG 文档字符串 | 始终按笔画裁剪 |
| [`copyToClipboard()`](#clipboard) | 系统剪贴板中的 PNG | 始终裁剪 |
| [`saveToPhotoLibrary(options?)`](#photo-library) | “照片”或相册中的 PNG 或 JPEG | `true` |
| [`getStrokeData()`](/zh/guide/stroke-data) | 可 JSON 序列化的原始笔画数据 | |

## 图片选项 {#options}

`toBase64`、`toFile` 和 `saveToPhotoLibrary` 接受相同的选项：

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `format` | `'png' \| 'jpeg'` | `'png'` | PNG 无损且带透明通道。JPEG 体积更小，没有透明通道。 |
| `quality` | `number` | `1` | 0 到 1，仅对 JPEG 有效，PNG 会忽略。 |
| `trim` | `boolean` | `false`（`saveToPhotoLibrary` 为 `true`） | 裁剪到签名区域，而不是整个画布。 |

图片按屏幕像素密度渲染：在 3 倍屏 iPhone 上，300×150 pt 的视图会得到 900×450 px 的图片；在 Android 上，尺寸等于视图的物理像素尺寸。

`trim` 按笔画的外接矩形加一小段边距进行裁剪（iOS 为 2 pt；Android 为 0.6 × `penMaxWidth` dp 加 2 px，且不超出视图）。画布为空时会得到整个画布。

## 背景 {#backgrounds}

墨迹后面是什么，取决于格式、导出目标和平台：

| 导出 | iOS | Android |
| --- | --- | --- |
| `toBase64` / `toFile` 的 PNG | 始终透明 | 设置了 `backgroundColor` 则包含，否则透明 |
| JPEG（所有方法） | `backgroundColor`，透明时为白色 | `backgroundColor`，透明时为白色 |
| `copyToClipboard()` | 透明 | 设置了 `backgroundColor` 则包含，否则透明 |
| `saveToPhotoLibrary` 的 PNG | 始终不透明：`backgroundColor` 或白色 | 设置了 `backgroundColor` 则包含，否则透明 |

iOS 保存到“照片”的图片始终不透明，因为“照片”查看器会把透明图片显示在黑色背景上，深色墨迹将难以辨认。如果希望 Android 上也得到不透明的结果，请设置 `backgroundColor` 或使用 `format: 'jpeg'`。

[基线](/zh/guide/props#baseline)和[工具栏](/zh/guide/toolbar)永远不会出现在导出结果中。

## Base64 {#base64}

```tsx
const base64 = await ref.current?.toBase64({ format: 'png', trim: true });
const dataUri = `data:image/png;base64,${base64}`;
```

返回的字符串不带 `data:` 前缀，也没有换行。base64 比二进制图片大约三分之一，并且作为一个完整字符串传到 JavaScript，因此对于最终要上传的全分辨率图片，建议使用 `toFile()`。

## 文件 {#file}

```tsx
const uri = await ref.current?.toFile({ format: 'jpeg', quality: 0.85 });
// file:///.../signature-1728100000000.jpg
```

文件在 iOS 上写入应用的临时目录，在 Android 上写入缓存目录，文件名为 `signature-<时间戳>.png` 或 `.jpg`。本库从不删除这些文件，用完后请移到持久位置或自行删除。

## SVG {#svg}

```tsx
const svg = await ref.current?.toSvg();
```

SVG 中每一笔对应一个 `<path>`，由该笔的采样点以直线段连接而成，笔画颜色为十六进制值，线帽和连接处为圆角。`viewBox` 按笔画裁剪。需要注意：

- **每个 path 只有一个宽度。** iOS 上为该笔各点宽度的平均值；Android 上为 `penMinWidth` 与 `penMaxWidth` 的中点。屏幕上墨迹的粗细变化不会被还原。
- **单位不同。** iOS 使用 pt；Android 使用物理像素，因此在高密度屏幕上，Android 生成的 SVG 中的数值更大。请通过 `viewBox` 缩放 SVG，而不要依赖其 `width` 和 `height`。
- 在 Android 上，单击（一个点）会变成 `<circle>`。
- 颜色不包含透明度。

如果需要精确的几何数据来自行渲染，请使用 [`getStrokeData()`](/zh/guide/stroke-data)，它在两个平台上都使用 pt 或 dp。

## 剪贴板 {#clipboard}

```tsx
ref.current?.copyToClipboard();
```

复制一张裁剪后的 PNG。该方法没有返回值，也不报告错误。画布为空时会复制一张空白图片，如有需要请先调用 `isEmpty()` 检查。

- **iOS** 设置 `UIPasteboard.general.image`。
- **Android** 把 `signature-clipboard.png` 写入缓存目录，并把随库附带的 `FileProvider` 生成的 `content://` URI 放入剪贴板。它还会为系统界面授予读取权限，让 Android 13+ 的剪贴板预览能够显示缩略图。

内置工具栏的复制按钮调用的是同一段代码。

## 相册 {#photo-library}

```tsx
const result = await ref.current?.saveToPhotoLibrary({ format: 'png' });
if (result && !result.granted) {
  // iOS：用户拒绝了访问
}
```

Promise 会 resolve 为 `{ granted, uri? }`：

| | iOS | Android |
| --- | --- | --- |
| 权限 | 首次使用时请求“添加到照片”权限，需要 `NSPhotoLibraryAddUsageDescription`。 | API 29+ 无需权限。API 28 及以下需要 `WRITE_EXTERNAL_STORAGE`。 |
| 保存位置 | “照片”图库，保留 PNG 或 JPEG 格式 | 通过 MediaStore 保存到 `Pictures/Signatures/`（API 29+） |
| `granted: false` | 用户拒绝或访问受限 | 图片无法插入或写入 |
| `uri` | 不提供 | 新图片的 `content://` URI |
| reject 的情况 | “照片”保存图片失败 | 抛出异常，例如 API 28 及以下缺少权限 |

权限配置见[安装](/zh/guide/installation)。
