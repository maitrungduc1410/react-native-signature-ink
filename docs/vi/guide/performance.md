---
description: "Ghi chú hiệu năng cho SignatureInk: thao tác nào rẻ, thao tác nào tốn kém trên từng nền tảng, xuất ảnh lớn, replay và dùng bảng ký trong list."
---

# Hiệu năng

Việc vẽ chạy hoàn toàn ở phía native. Các lần chạm không bao giờ được gửi sang JavaScript, nên nét mực luôn theo kịp ngón tay kể cả khi JavaScript thread đang bận. Chi phí còn lại nằm ở một vài thao tác cụ thể.

## Trong lúc vẽ {#while-drawing}

- **iOS**: PencilKit render nét mực. Không có gì để tinh chỉnh.
- **Android**: mỗi mẫu chạm vẽ một đoạn Bezier ngắn vào bitmap offscreen, còn màn hình chỉ sao chép bitmap đó. Chữ ký dài tốn chi phí mỗi frame bằng chữ ký ngắn.

Việc duy nhất của JavaScript trong lúc vẽ là các callback sự kiện: `onBegin`, `onEnd` và `onChange`. Hãy giữ chúng nhẹ. Đặc biệt, tránh xuất ảnh ở mỗi lần `onChange`; hãy xuất khi người dùng xác nhận.

## Thao tác tốn kém {#costly-operations}

| Thao tác | Vì sao tốn hơn |
| --- | --- |
| Đổi `penColor` hoặc `backgroundColor` trên Android | Bitmap được cấp phát lại và mọi nét được vẽ lại. Đổi độ dày bút thì rẻ. |
| `undo()` và `redo()` trên Android | Bitmap bị xoá và mọi nét còn lại được vẽ lại. |
| `undo()`, `redo()`, `clear()`, `setStrokeData()` trên iOS | Canvas PencilKit được dựng lại để lịch sử nội bộ của nó luôn nhất quán. |
| `replay()` trên Android | Mọi nét đã hiện được vẽ lại ở mỗi frame. Ổn với chữ ký, chậm hơn với bản vẽ hàng nghìn điểm. |
| Đổi kích thước view trên Android | Một bitmap mới được cấp phát theo kích thước mới và các nét được vẽ lại. |

Tất cả đều nhanh với bản vẽ cỡ chữ ký (vài chục nét). Chúng chỉ đáng kể khi bạn dùng view như một bảng vẽ đa năng với bản vẽ rất lớn.

## Xuất ảnh {#exports}

- `toBase64()` tạo một chuỗi lớn hơn ảnh khoảng một phần ba và chuyển sang JavaScript trong một lần. Với PNG toàn màn hình trên màn hình 3×, chuỗi có thể lên tới vài megabyte. Hãy ưu tiên `toFile()` và đưa URI `file://` cho code upload của bạn.
- Dùng `trim: true` để chỉ xuất vùng chữ ký. Thường nhỏ hơn nhiều so với cả canvas.
- Dùng `format: 'jpeg'` với `quality` khoảng `0.8` khi bạn không cần nền trong suốt.
- `toSvg()` và `getStrokeData()` nhỏ và nhanh; chúng không render pixel.

## List {#lists}

Mỗi `SignatureInk` sở hữu một canvas native (và trên Android là một bitmap bằng kích thước view). Vài cái trên một màn hình thì không sao. Với list dài:

- Truyền `removeClippedSubviews={false}` cho `FlatList`. Việc tháo rồi gắn lại view vẽ native theo cách này không ổn định, nhất là trên Android.
- Row cuộn ra xa sẽ bị unmount và mất bản vẽ. Hãy lưu stroke data của từng row (ví dụ trong `onEnd` bằng `getStrokeData()`) và khôi phục bằng `setStrokeData()` khi row được mount lại.
- Nên hiện ảnh tĩnh (từ `toFile()`) cho các row không đang chỉnh sửa, và chỉ mount bảng ký thật cho row người dùng đang ký.

Xem màn hình FlatList trong example app của repository để có một ví dụ chạy được.

## Replay {#replay}

Thời lượng replay tăng theo số điểm (4 ms mỗi điểm, tối thiểu 0.5 s). Với bản vẽ dài, hãy truyền `speed` cao hơn thay vì để replay chạy nhiều giây.
