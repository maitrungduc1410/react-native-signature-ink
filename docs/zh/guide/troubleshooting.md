---
description: "SignatureInk 常见问题的解决方法：无法绘制、工具栏图标不可见、Promise 错误、相册权限、深色模式墨迹和构建问题。"
---

# 故障排查

## 无法绘制 {#nothing-draws}

- **视图没有尺寸。** `SignatureInk` 没有固有高度。请设置 `height`，或在有尺寸的父视图中使用 `flex: 1`。
- **开启了 `pencilOnly`。** 两个平台都会忽略手指。Android 上手写笔的橡皮擦端也会被忽略。
- **墨迹与背景同色。** 默认笔色为黑色（iOS）或 `#111111`（Android），不会跟随深色模式变化。深色背景下请设置 `penColor`。见[深色背景](/zh/guide/quick-start#dark-backgrounds)。
- **未启用新架构。** 本库只提供 Fabric 组件。见[安装](/zh/guide/installation#requirements)。

## Android 上工具栏图标不可见 {#invisible-icons}

未设置 `toolbarTintColor` 时，Android 会把 save、share、download、check 以及“…”溢出按钮绘制为白色。请把 `toolbarTintColor`（或单个按钮的 `tintColor`）设为与背景对比明显的颜色。见[工具栏颜色](/zh/guide/toolbar#colors)。

## 溢出菜单显示小写的“undo” {#overflow-labels}

菜单项使用 `accessibilityLabel`，未设置时依次回退到 `text` 和 `id`。请为可能进入溢出菜单的按钮设置 `text` 或 `accessibilityLabel`：

```tsx
toolbarButtons={[{ id: 'undo', accessibilityLabel: '撤销' }]}
```

## “SignatureInk: native view is not mounted yet” {#not-mounted}

在原生视图存在之前调用了返回 Promise 的方法（`toBase64`、`toFile`、`toSvg`、`getStrokeData`、`isEmpty`、`saveToPhotoLibrary`）。请在事件处理函数中或组件挂载之后调用，并对 ref 使用可选链。

## “SignatureInk unmounted” {#unmounted}

返回 Promise 的方法还在等待原生端结果时，组件被卸载了，例如用户在导出过程中离开了页面。未完成的调用会被 reject，以免一直挂起。请捕获这个错误；如果页面已经关闭，也可以忽略它。

## “Failed to encode image”或“Failed to render bitmap” {#render-failed}

原生端无法生成图片。在 Android 上，这发生在视图尚未完成布局（尺寸为 0）时。导出前请确认视图可见且有尺寸。

## saveToPhotoLibrary {#photo-library}

- **iOS 应用在保存时崩溃。** `Info.plist` 中缺少 `NSPhotoLibraryAddUsageDescription`。没有这个键就请求相册权限的应用会被 iOS 终止。
- **iOS 上 resolve 为 `granted: false`。** 用户之前拒绝过访问。iOS 不会再次询问，请用 `Linking.openSettings()` 引导用户前往设置。
- **在 Android 9 及以下被 reject。** 在这些版本上写入相册需要 `WRITE_EXTERNAL_STORAGE`。请以 `android:maxSdkVersion="28"` 声明它，并在保存前用 `PermissionsAndroid` 请求权限。
- **保存的 PNG 在相册中显示为黑底（Android）。** 未设置 `backgroundColor` 时 PNG 是透明的，而部分相册应用会把透明区域显示为黑色。请设置 `backgroundColor` 或使用 `format: 'jpeg'`。见[背景](/zh/guide/export#backgrounds)。

## iOS 与 Android 的导出结果不同 {#exports-differ}

这大多是设计使然。iOS 的 PNG 始终透明，Android 的 PNG 则包含 `backgroundColor`；裁剪边距不同；SVG 的单位在 iOS 上是 pt，在 Android 上是像素。完整列表见 [iOS 与 Android 差异](/zh/guide/platform-differences#exports)。

## 恢复的笔画颜色不对 {#restored-color}

笔画数据不保存颜色。`setStrokeData()` 使用当前的 `penColor`（在 Android 上还会使用当前的笔宽）绘制。请在恢复之前设置好这些 props。见[恢复](/zh/guide/stroke-data#restoring)。

## 回放被打断后笔画消失 {#replay-lost}

如果在 `replay()` 期间用户开始书写，或你调用了 `undo()`、`redo()`、`clear()` 或 `setStrokeData()`，只会保留已经显示出来的笔画。请在回放前保存笔画数据，并在需要时恢复。见[被打断时](/zh/guide/stroke-data#interrupting)。

## Android 上撤销的行为不同 {#undo-android}

在 Android 上，`undo()` 只会移除笔画：`clear()` 无法撤销；`setStrokeData()` 之后，撤销会逐笔移除恢复的笔画。iOS 则把 `clear()` 和 `setStrokeData()` 视为可撤销的步骤。见[历史记录](/zh/guide/methods#history)。

## 墨迹类型没有效果 {#ink-type}

`defaultInkType` 仅适用于 iOS。`monoline`、`fountainPen`、`watercolor` 和 `crayon` 需要 iOS 17，更早的版本会回退为 `pen`。

## 升级后构建出错 {#build-errors}

原生代码由 TypeScript 规范生成。升级后请在 `ios/` 中运行 `pod install` 并重新构建原生应用；如果 Android 的生成文件看起来过时，请运行 `./gradlew clean`。使用 Expo 时，运行 `npx expo prebuild --clean` 后重新构建。不支持 Expo Go。

## 仍未解决？ {#still-stuck}

请在 [GitHub](https://github.com/maitrungduc1410/react-native-signature-ink/issues) 上提交 issue，附上 React Native 版本、平台、系统版本和一段最小复现代码。先运行仓库中的 example 应用，通常就能判断问题出在库本身还是周围的布局。
