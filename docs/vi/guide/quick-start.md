---
description: "Thêm bảng ký tên native vào một màn hình React Native, kiểm tra người dùng đã ký chưa và xuất chữ ký thành PNG đã cắt sát."
---

# Bắt đầu nhanh

Trang này dựng một màn hình ký tên nhỏ: bảng ký có đường kẻ và toolbar có sẵn, nút Lưu chỉ bật khi đã có chữ ký, và xuất ảnh PNG.

## 1. Render bảng ký {#render-the-pad}

`SignatureInk` không có kích thước nội tại. Hãy đặt chiều cao (hoặc `flex: 1`) qua `style`.

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
      <Button title="Lưu" disabled={!signed} onPress={save} />
    </View>
  );

  async function save() {
    // xem bước 2
  }
}
```

- `showBaseline` vẽ đường kẻ ký tên nét đứt.
- `showToolbar` thêm các nút native undo, redo, xoá và copy. Xem [Toolbar](/vi/guide/toolbar).
- `onChange` được gọi mỗi khi bản vẽ thay đổi, kèm `{ isEmpty, strokeCount }`. Xem [Sự kiện](/vi/guide/events).

## 2. Xuất chữ ký {#export-the-signature}

Mọi phương thức xuất đều nằm trên ref và trả về Promise.

```tsx
async function save() {
  const base64 = await ref.current?.toBase64({ format: 'png', trim: true });
  if (!base64) return;
  await upload(`data:image/png;base64,${base64}`); // hàm upload của bạn
}
```

`toBase64()` trả về chuỗi base64 thuần, không có tiền tố `data:`. `trim: true` cắt ảnh sát vùng chữ ký thay vì lấy cả canvas. Với ảnh lớn, [`toFile()`](/vi/guide/export#file) giúp tránh gửi một chuỗi dài sang JavaScript.

## 3. Dùng nút của riêng bạn {#use-your-own-buttons}

Bỏ `showToolbar` và gọi các phương thức qua ref từ UI của bạn:

```tsx
<View style={{ flexDirection: 'row', gap: 8 }}>
  <Button title="Hoàn tác" onPress={() => ref.current?.undo()} />
  <Button title="Xoá" onPress={() => ref.current?.clear()} />
</View>
```

Danh sách đầy đủ có ở [Phương thức qua ref](/vi/guide/methods).

## 4. Nền tối {#dark-backgrounds}

Canvas mặc định trong suốt, nên nền của view cha sẽ hiện qua. Trên màn hình tối, hãy chọn bút sáng màu và màu tint sáng cho toolbar:

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

Trên iOS, màu mực được dùng đúng như bạn truyền vào; PencilKit không đảo màu ở dark mode, cả trên màn hình lẫn khi xuất ảnh.

## Bước tiếp theo {#next-steps}

- [Mọi prop, kèm bản xem trực tiếp](/vi/guide/props)
- [Định dạng xuất](/vi/guide/export)
- [Lưu và khôi phục nét vẽ](/vi/guide/stroke-data)
