---
description: "Cấu hình toolbar native của SignatureInk: undo, redo, xoá và copy có sẵn, nút tuỳ chỉnh bằng icon hoặc chữ, màu tint và menu overflow."
---

# Toolbar

Bật `showToolbar` để có một thanh nút native ngay trong view. Mặc định nó gồm undo, redo, xoá và copy.

```tsx
<SignatureInk showToolbar style={{ height: 240 }} />
```

Thanh này chiếm `toolbarHeight` của view (44 trên iOS, 48 trên Android) ở trên hoặc dưới, và vùng vẽ thu nhỏ lại để nhường chỗ. Các nút được căn về phía cuối. Nếu bạn thích nút của riêng mình, hãy tắt toolbar và gọi các [phương thức qua ref](/vi/guide/methods).

## Props của toolbar {#props}

| Prop | Kiểu | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `showToolbar` | `boolean` | `false` | |
| `toolbarPosition` | `'top' \| 'bottom'` | `'bottom'` | |
| `toolbarButtons` | `ToolbarItem[]` | undo, redo, clear, copy | Giữ nguyên thứ tự. |
| `toolbarMaxVisibleButtons` | `number` | `0` | Số nút hiển thị trực tiếp tối đa. `0` nghĩa là hiện nhiều nhất mà chiều rộng cho phép. |
| `toolbarBackgroundColor` | `ColorValue` | `transparent` | |
| `toolbarTintColor` | `ColorValue` | mặc định theo nền tảng | Màu của icon và nhãn. Xem [Màu sắc](#colors). |
| `toolbarHeight` | `number` | iOS: `44`, Android: `48` | Khoảng trống trên và dưới icon là `(toolbarHeight - chiều cao icon) / 2`. |
| `toolbarIconSpacing` | `number` | `8` | Khoảng cách ngang giữa các nút. |

## Các nút {#buttons}

Mỗi phần tử trong `toolbarButtons` là một object:

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | `string` | `'undo'`, `'redo'`, `'clear'` và `'copy'` chạy hành động có sẵn. Mọi id khác là nút tuỳ chỉnh. |
| `icon` | `ToolbarIconName` | Một trong `undo`, `redo`, `clear`, `copy`, `save`, `share`, `download`, `check`. |
| `text` | `string` | Nhãn, hiện sau icon khi có cả hai. |
| `tintColor` | `ColorValue` | Màu riêng cho nút. Nếu không có thì dùng `toolbarTintColor`. |
| `accessibilityLabel` | `string` | Mặc định lấy `text`, sau đó đến `id`. |
| `disabled` | `boolean` | Mờ còn 40% và không bấm được. |

Hãy dùng các hằng số được export thay vì chuỗi thô để tránh gõ sai:

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
    { id: ToolbarAction.Undo },                          // icon mặc định
    { ...DefaultToolbarItems.clear, text: 'Xoá' },       // icon và nhãn
    { id: 'save', icon: ToolbarIcon.Save, text: 'Lưu' }, // nút tuỳ chỉnh
  ]}
  onToolbarAction={({ id }) => {
    if (id === 'save') save();
  }}
/>;
```

### Nút có sẵn {#built-in-buttons}

Nút có sẵn không có cả `icon` lẫn `text` sẽ dùng icon mặc định. Khi bạn đặt `text`, chỉ những gì bạn đặt mới được hiện, nên `{ id: 'clear', text: 'Xoá' }` là nút chỉ có chữ. Hãy spread `DefaultToolbarItems.clear` (hoặc tự đặt `icon`) để giữ icon bên cạnh nhãn.

Khi chạm vào nút có sẵn, hành động native chạy trước, sau đó `onToolbarAction` được gọi với id của nút.

### Nút tuỳ chỉnh {#custom-buttons}

Mọi `id` khác là nút tuỳ chỉnh. Nó không có hành vi native nào: chạm vào chỉ gọi `onToolbarAction({ id })`. TypeScript yêu cầu nút tuỳ chỉnh có ít nhất `icon` hoặc `text`.

Id nên là duy nhất. Hai nút trùng id thì không phân biệt được trong `onToolbarAction`; ở môi trường development, component sẽ log cảnh báo khi phát hiện trùng.

### Icon {#icons}

Tên icon ánh xạ sang SF Symbols trên iOS và sang vector drawable đi kèm, vẽ theo cùng bộ symbol, trên Android:

| `icon` | SF Symbol trên iOS |
| --- | --- |
| `undo` | `arrow.uturn.backward` |
| `redo` | `arrow.uturn.forward` |
| `clear` | `trash` |
| `copy` | `doc.on.doc` |
| `save` | `square.and.arrow.down` |
| `share` | `square.and.arrow.up` |
| `download` | `arrow.down.circle` |
| `check` | `checkmark` |

## Màu sắc {#colors}

Khi không có `toolbarTintColor`, hai nền tảng trông khác nhau:

- **iOS** dùng tint color của view (màu xanh hệ thống, trừ khi app của bạn đổi).
- **Android** vẽ mỗi icon bằng màu gốc của drawable: đen cho undo, redo, clear và copy, nhưng **trắng** cho save, share, download, check và nút overflow. Nhãn chữ dùng màu chữ nút của theme.

Vì vậy trên Android, icon tuỳ chỉnh và nút "…" sẽ vô hình trên nền sáng nếu bạn không đặt tint. Hãy đặt `toolbarTintColor` mỗi khi dùng icon tuỳ chỉnh hoặc menu overflow, và chọn tint sáng trên nền tối.

## Menu overflow {#overflow}

Khi các nút không vừa, những nút thừa sẽ chuyển vào menu "…" ở cuối thanh. `toolbarMaxVisibleButtons` giới hạn số nút hiện trực tiếp ngay cả khi còn chỗ.

- Nút chỉ có icon chiếm một ô rộng 44; nút có chữ được đo theo nội dung.
- **iOS 14+** mở menu native với icon và nhãn của từng mục; iOS cũ hơn hiện action sheet.
- **Android** mở `PopupMenu` chỉ có nhãn. Nó theo light mode và dark mode.
- Mục trong menu dùng `accessibilityLabel` của nút, mặc định là `text` rồi đến `id`. Vì thế `{ id: 'undo' }` trơn sẽ hiện là "undo" trong menu. Hãy đặt `text` hoặc `accessibilityLabel` cho các nút có thể bị đẩy vào overflow.

Accessibility label của nút overflow là "More" và chưa được bản địa hoá.

## Accessibility {#accessibility}

Nút icon có kích thước 44×44 và nút chữ cao 44, đạt kích thước vùng chạm thông dụng. Mỗi nút cung cấp `accessibilityLabel` của nó, và nút `disabled` được báo là bị vô hiệu hoá. Khi không truyền `toolbarButtons`, các nút mặc định có nhãn "Undo", "Redo", "Clear" và "Copy". Khi bạn truyền danh sách riêng, nhãn lấy từ `accessibilityLabel`, `text` hoặc `id`, nên hãy đặt nhãn dễ đọc bằng ngôn ngữ của app cho các nút có sẵn.
