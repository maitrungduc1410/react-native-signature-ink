---
description: "Ref API của SignatureInk: clear, undo, redo, copy, replay, stroke data và các phương thức xuất trả về Promise, cùng quy tắc thời điểm, lịch sử và lỗi."
---

# Phương thức qua ref

Gắn một ref có type `SignatureInkHandle` để gọi phương thức trên native view.

```tsx
import { useRef } from 'react';
import { SignatureInk, type SignatureInkHandle } from 'react-native-signature-ink';

const ref = useRef<SignatureInkHandle>(null);

<SignatureInk ref={ref} style={{ height: 240 }} />;

ref.current?.undo();
const empty = await ref.current?.isEmpty();
```

## Tổng quan {#overview}

| Phương thức | Trả về | Chức năng |
| --- | --- | --- |
| `clear()` | `void` | Xoá mọi nét vẽ. |
| `undo()` | `void` | Lùi lại một bước trong lịch sử. |
| `redo()` | `void` | Áp dụng lại bước vừa undo. |
| `copyToClipboard()` | `void` | Đưa ảnh PNG đã cắt sát vào clipboard hệ thống. |
| `replay(options?)` | `void` | Phát lại các nét vẽ thành animation. |
| `setStrokeData(data)` | `void` | Thay bản vẽ bằng các nét đã lưu. |
| `isEmpty()` | `Promise<boolean>` | `true` khi chưa có nét nào. |
| `toBase64(options?)` | `Promise<string>` | PNG hoặc JPEG dạng base64 thuần. |
| `toFile(options?)` | `Promise<string>` | PNG hoặc JPEG ghi ra file, trả về URI `file://`. |
| `toSvg()` | `Promise<string>` | Một tài liệu SVG. |
| `getStrokeData()` | `Promise<StrokeData>` | Các nét vẽ ở dạng dữ liệu tương thích JSON. |
| `saveToPhotoLibrary(options?)` | `Promise<SavedToPhotoLibraryResult>` | Lưu ảnh vào Photos hoặc thư viện ảnh. |

Các phương thức xuất được mô tả ở [Định dạng xuất](/vi/guide/export), còn `getStrokeData`, `setStrokeData` và `replay` ở [Dữ liệu nét vẽ và replay](/vi/guide/stroke-data).

## Undo, redo và clear {#history}

Mô hình lịch sử không giống nhau trên hai nền tảng:

| | iOS | Android |
| --- | --- | --- |
| `undo()` hoàn tác gì | Nét cuối, `clear()` hoặc `setStrokeData()` | Nét cuối |
| `clear()` | Undo được | Không undo được; còn làm rỗng redo stack |
| `setStrokeData()` | Undo được | Bản vẽ trước bị mất; `undo()` gỡ từng nét vừa khôi phục |
| Một nét mới | Làm rỗng redo stack | Làm rỗng redo stack |

`undo()` và `redo()` không làm gì khi không còn gì để undo hay redo. Nếu bạn cần hành vi giống nhau trên cả hai nền tảng, ví dụ nút "Xoá" có thể hoàn tác, hãy tự giữ một bản sao bằng `getStrokeData()` trước khi xoá và khôi phục bằng `setStrokeData()`.

## Replay {#replay}

```tsx
ref.current?.replay();               // tốc độ tự nhiên
ref.current?.replay({ speed: 2 });   // nhanh gấp đôi
```

Thời lượng gốc khoảng 4 ms cho mỗi điểm đã ghi, tối thiểu 0.5 s, chia cho `speed`. `speed` mặc định là `1` và không nhỏ hơn `0.05`. Gọi `replay()` trên canvas trống sẽ không làm gì. Xem thêm ở [Dữ liệu nét vẽ và replay](/vi/guide/stroke-data#replay).

## Khi nào phương thức chạy {#timing}

- Phương thức trả về `void` sẽ không làm gì nếu native view chưa được mount.
- Phương thức trả về Promise sẽ reject với `SignatureInk: native view is not mounted yet` nếu bạn gọi trước khi mount.
- Nếu component unmount khi Promise còn đang chờ, nó reject với `SignatureInk unmounted`.
- Lỗi phía native reject với thông điệp của native, ví dụ `Failed to encode image` (iOS) hoặc `Failed to render bitmap` (Android, khi view chưa được layout).

Vì vậy hãy bọc các lệnh xuất trong `try`/`catch`, nhất là trong list nơi row có thể unmount bất cứ lúc nào:

```tsx
try {
  const uri = await ref.current?.toFile({ format: 'jpeg', quality: 0.9 });
} catch (e) {
  // view đã unmount hoặc xuất ảnh thất bại
}
```

## Nút toolbar gọi cùng một đoạn code {#toolbar-buttons}

Chạm vào nút undo, redo, clear hoặc copy có sẵn sẽ chạy đúng đoạn code native của phương thức ref tương ứng, sau đó gọi [`onToolbarAction`](/vi/guide/events#ontoolbaraction).
