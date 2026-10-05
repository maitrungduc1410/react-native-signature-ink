---
description: "Mọi prop của SignatureInk kèm giá trị mặc định theo nền tảng: màu và độ dày bút, nền, đường kẻ, chỉ nhận stylus và tuỳ chọn PencilKit trên iOS."
---

# Props

Mọi prop đều không bắt buộc. Kích thước, độ dày và khoảng cách không phụ thuộc mật độ màn hình: point trên iOS, dp trên Android. Cùng một con số cho cùng kích thước thực trên mọi màn hình và cả hai nền tảng.

## Thử ngay {#try-it}

Hãy vẽ lên bảng và thay đổi props. Nét mực dùng bản port JavaScript của renderer Android, nên khá giống những gì bạn thấy trên thiết bị Android; PencilKit trên iOS trông hơi khác (xem [iOS và Android](/vi/guide/platform-differences)). JSX tương ứng nằm ở cuối.

<SignaturePad />

## Bố cục {#layout}

| Prop | Kiểu | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `style` | `StyleProp<ViewStyle>` | | View không có kích thước nội tại. Hãy đặt `height` hoặc `flex`. |

## Bút {#pen}

| Prop | Kiểu | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `penColor` | `ColorValue` | iOS: đen, Android: `#111111` | Áp dụng cho nét mới. Nét cũ giữ nguyên màu. |
| `penMinWidth` | `number` | `1` | Nét mảnh nhất, khi bút di chuyển nhanh. |
| `penMaxWidth` | `number` | `3` | Nét dày nhất, khi bút di chuyển chậm. |
| `velocityFilterWeight` | `number` | `0.7` | Chỉ Android. Giới hạn trong khoảng 0 đến 1. |

Khoảng độ dày được dùng khác nhau tuỳ nền tảng:

- **Android** tính độ dày của từng đoạn cong bằng `max(penMaxWidth / (velocity + 1), penMinWidth)`, với vận tốc tính bằng dp mỗi mili giây. `velocityFilterWeight` là trọng số của mẫu vận tốc mới nhất trong một bộ lọc hàm mũ: giá trị cao phản ứng nhanh hơn, giá trị thấp cho nét thon mượt và chậm hơn.
- **iOS** đưa cho PencilKit một độ dày duy nhất, là trung điểm của hai giá trị (`2` với mặc định), rồi PencilKit tự thay đổi nét theo lực nhấn và tốc độ. `velocityFilterWeight` bị bỏ qua.

Trên iOS, màu mực được dùng đúng như bạn truyền vào. Dark mode không đảo màu, cả trên màn hình lẫn khi xuất ảnh, nên hãy truyền màu cụ thể như `'#111'` hoặc `'white'`, đừng dùng màu hệ thống tự thích ứng.

## Canvas {#canvas}

| Prop | Kiểu | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `backgroundColor` | `ColorValue` | `transparent` | Màu nền canvas. Với mặc định, nền view cha sẽ hiện qua. |

`backgroundColor` là một prop chứ không phải key trong style, vì nó còn ảnh hưởng đến ảnh xuất: ảnh JPEG và ảnh lưu vào thư viện được ghép lên màu này (hoặc lên nền trắng khi nó trong suốt), và trên Android ảnh PNG cũng chứa nó. Xem [Định dạng xuất](/vi/guide/export#backgrounds).

## Đường kẻ ký tên {#baseline}

Đường kẻ được vẽ cách mép trái và phải 16 đơn vị. Nó không bao giờ xuất hiện trong ảnh xuất.

| Prop | Kiểu | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `showBaseline` | `boolean` | `false` | |
| `baselineColor` | `ColorValue` | xám 50% | iOS: `systemGray` độ mờ 50%. Android: `#80808080`. |
| `baselineStyle` | `'solid' \| 'dashed' \| 'dotted'` | `'dashed'` | Giá trị không hợp lệ sẽ quay về `'dashed'`. |
| `baselineWidth` | `number` | `0` | `0` nghĩa là tự động: `1` cho solid và dashed, dày hơn một chút cho dotted (iOS `1.5`, Android `2`). |
| `baselineOffsetFromBottom` | `number` | iOS: `8`, Android: `16` | Khoảng cách tính từ đáy vùng vẽ. Bị bỏ qua khi toolbar đang hiện. |

Khi [toolbar](/vi/guide/toolbar) hiện, đường kẻ nằm ngay ranh giới giữa vùng vẽ và toolbar, nhờ vậy khoảng trống quanh icon luôn đều và đường kẻ không nhảy chỗ khi bạn chuyển toolbar lên trên.

## Đầu vào {#input}

| Prop | Kiểu | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `pencilOnly` | `boolean` | `false` | Chỉ nhận đầu vào từ bút stylus. |

- **iOS** đặt `PKCanvasViewDrawingPolicy.pencilOnly`: chỉ Apple Pencil vẽ được, chạm bằng ngón tay bị bỏ qua. Drawing policy cần iOS 14 trở lên.
- **Android** bỏ qua mọi lần chạm có pointer không phải `MotionEvent.TOOL_TYPE_STYLUS`. Đầu tẩy của bút stylus báo một tool type khác nên cũng bị bỏ qua.

## Toolbar {#toolbar}

| Prop | Kiểu | Mặc định |
| --- | --- | --- |
| `showToolbar` | `boolean` | `false` |
| `toolbarPosition` | `'top' \| 'bottom'` | `'bottom'` |
| `toolbarButtons` | `ToolbarItem[]` | undo, redo, clear, copy |
| `toolbarMaxVisibleButtons` | `number` | `0` (vừa với chiều rộng) |
| `toolbarBackgroundColor` | `ColorValue` | `transparent` |
| `toolbarTintColor` | `ColorValue` | xem [Toolbar](/vi/guide/toolbar#colors) |
| `toolbarHeight` | `number` | iOS: `44`, Android: `48` |
| `toolbarIconSpacing` | `number` | `8` |

Chi tiết, nút tuỳ chỉnh và menu overflow có ở trang [Toolbar](/vi/guide/toolbar).

## Chỉ trên iOS {#ios-only}

| Prop | Kiểu | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `showToolPicker` | `boolean` | `false` | Hiện tool picker hệ thống của PencilKit. |
| `defaultInkType` | `InkType` | `'pen'` | Loại mực PencilKit ban đầu. |

Android bỏ qua cả hai prop này.

`defaultInkType` nhận `'pen'`, `'pencil'` và `'marker'` trên mọi phiên bản iOS. `'monoline'`, `'fountainPen'`, `'watercolor'` và `'crayon'` cần iOS 17; trên phiên bản cũ hơn chúng quay về `'pen'`.

```tsx
<SignatureInk showToolPicker defaultInkType="fountainPen" />
```

Với `showToolPicker`, người dùng có thể đổi loại mực, màu, độ dày và chuyển sang tẩy. Picker che phần dưới màn hình (khoảng 220 pt trên iPhone), nên hãy chừa chỗ trong layout. Nó được gỡ ra khi view rời khỏi window, nên không bao giờ nằm đè lên màn hình kế tiếp. Màu chọn ở dark mode được giữ như khi nhìn ở light mode, giống cách `penColor` hoạt động.

## Sự kiện {#events}

`onBegin`, `onEnd`, `onChange`, `onReplayProgress` và `onToolbarAction` được trình bày ở trang [Sự kiện](/vi/guide/events).
