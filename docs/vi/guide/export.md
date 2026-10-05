---
description: "Xuất chữ ký thành PNG hoặc JPEG dạng base64 hay file, SVG, vào clipboard hoặc thư viện ảnh, kèm quy tắc cắt sát, chất lượng và màu nền."
---

# Định dạng xuất

| Phương thức | Kết quả | Mặc định trim |
| --- | --- | --- |
| [`toBase64(options?)`](#base64) | PNG hoặc JPEG, chuỗi base64 thuần | `false` |
| [`toFile(options?)`](#file) | File PNG hoặc JPEG, URI `file://` | `false` |
| [`toSvg()`](#svg) | Chuỗi tài liệu SVG | luôn cắt theo nét |
| [`copyToClipboard()`](#clipboard) | PNG trong clipboard hệ thống | luôn cắt sát |
| [`saveToPhotoLibrary(options?)`](#photo-library) | PNG hoặc JPEG trong Photos hoặc thư viện ảnh | `true` |
| [`getStrokeData()`](/vi/guide/stroke-data) | Nét vẽ thô dạng dữ liệu tương thích JSON | |

## Tuỳ chọn ảnh {#options}

`toBase64`, `toFile` và `saveToPhotoLibrary` nhận cùng các tuỳ chọn:

| Tuỳ chọn | Kiểu | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `format` | `'png' \| 'jpeg'` | `'png'` | PNG không mất dữ liệu và có kênh alpha. JPEG nhỏ hơn và không có alpha. |
| `quality` | `number` | `1` | Từ 0 đến 1, chỉ cho JPEG. Bị bỏ qua với PNG. |
| `trim` | `boolean` | `false` (`true` với `saveToPhotoLibrary`) | Cắt sát chữ ký thay vì lấy cả canvas. |

Ảnh được render theo mật độ điểm ảnh của màn hình: view 300×150 pt trên iPhone 3× cho ảnh 900×450 px, còn trên Android kích thước bằng kích thước view tính theo pixel vật lý.

`trim` cắt theo khung bao của các nét cộng thêm một lề nhỏ (2 pt trên iOS; trên Android là 0.6 × `penMaxWidth` dp cộng 2 px, không vượt quá view). Với canvas trống, bạn nhận được toàn bộ canvas.

## Màu nền {#backgrounds}

Phía sau nét mực là gì phụ thuộc vào định dạng, nơi nhận và nền tảng:

| Kiểu xuất | iOS | Android |
| --- | --- | --- |
| PNG từ `toBase64` / `toFile` | Luôn trong suốt | `backgroundColor` nếu có, không thì trong suốt |
| JPEG (mọi phương thức) | `backgroundColor`, hoặc trắng nếu trong suốt | `backgroundColor`, hoặc trắng nếu trong suốt |
| `copyToClipboard()` | Trong suốt | `backgroundColor` nếu có, không thì trong suốt |
| PNG từ `saveToPhotoLibrary` | Luôn đục: `backgroundColor`, hoặc trắng | `backgroundColor` nếu có, không thì trong suốt |

iOS luôn lưu ảnh đục vào Photos vì trình xem của Photos hiển thị ảnh trong suốt trên nền đen, khiến mực tối không đọc được. Nếu bạn muốn kết quả đục như vậy trên Android, hãy đặt `backgroundColor` hoặc dùng `format: 'jpeg'`.

[Đường kẻ ký tên](/vi/guide/props#baseline) và [toolbar](/vi/guide/toolbar) không bao giờ có trong ảnh xuất.

## Base64 {#base64}

```tsx
const base64 = await ref.current?.toBase64({ format: 'png', trim: true });
const dataUri = `data:image/png;base64,${base64}`;
```

Chuỗi không có tiền tố `data:` và không có ký tự xuống dòng. Base64 lớn hơn ảnh nhị phân khoảng một phần ba và được chuyển sang JavaScript thành một chuỗi duy nhất, nên hãy ưu tiên `toFile()` cho ảnh độ phân giải đầy đủ mà bạn sẽ upload.

## File {#file}

```tsx
const uri = await ref.current?.toFile({ format: 'jpeg', quality: 0.85 });
// file:///.../signature-1728100000000.jpg
```

File được ghi vào thư mục tạm của app trên iOS và thư mục cache trên Android, với tên `signature-<timestamp>.png` hoặc `.jpg`. Thư viện không bao giờ xoá các file này. Hãy chuyển chúng đến nơi lưu lâu dài hoặc xoá đi khi dùng xong.

## SVG {#svg}

```tsx
const svg = await ref.current?.toSvg();
```

SVG gồm một `<path>` cho mỗi nét, dựng từ các điểm của nét thành những đoạn thẳng, với màu nét ở dạng hex và đầu nét, góc nối bo tròn. `viewBox` được cắt theo các nét. Cần lưu ý:

- **Mỗi path chỉ có một độ dày.** Trên iOS là độ dày trung bình các điểm của nét; trên Android là trung điểm của `penMinWidth` và `penMaxWidth`. Phần đậm nhạt của nét mực trên màn hình không được tái hiện.
- **Đơn vị khác nhau.** iOS dùng point; Android dùng pixel vật lý, nên các con số trong SVG từ Android lớn hơn trên màn hình mật độ cao. Hãy co giãn SVG qua `viewBox` thay vì dựa vào `width` và `height`.
- Trên Android, một lần chạm đơn (một chấm) trở thành `<circle>`.
- Màu được ghi không kèm alpha.

Nếu bạn cần hình học chính xác để tự render, hãy dùng [`getStrokeData()`](/vi/guide/stroke-data), vốn dùng point hoặc dp trên cả hai nền tảng.

## Clipboard {#clipboard}

```tsx
ref.current?.copyToClipboard();
```

Sao chép một ảnh PNG đã cắt sát. Phương thức không trả về gì và không báo lỗi. Trên canvas trống nó sao chép một ảnh trắng, nên hãy kiểm tra `isEmpty()` trước nếu điều đó quan trọng.

- **iOS** gán `UIPasteboard.general.image`.
- **Android** ghi `signature-clipboard.png` vào thư mục cache và đưa một URI `content://` từ `FileProvider` đi kèm vào clipboard. Nó cũng cấp quyền đọc cho system UI để bản xem trước clipboard của Android 13+ hiện được thumbnail.

Nút copy trên toolbar có sẵn gọi cùng đoạn code này.

## Thư viện ảnh {#photo-library}

```tsx
const result = await ref.current?.saveToPhotoLibrary({ format: 'png' });
if (result && !result.granted) {
  // iOS: người dùng đã từ chối quyền truy cập
}
```

Promise resolve với `{ granted, uri? }`:

| | iOS | Android |
| --- | --- | --- |
| Quyền | Xin quyền "Thêm vào Ảnh" ở lần đầu. Cần `NSPhotoLibraryAddUsageDescription`. | Không cần trên API 29+. API 28 trở xuống cần `WRITE_EXTERNAL_STORAGE`. |
| Lưu ở đâu | Thư viện Photos, giữ nguyên định dạng PNG hoặc JPEG | `Pictures/Signatures/` qua MediaStore (trên API 29+) |
| `granted: false` | Người dùng từ chối hoặc quyền bị giới hạn | Không chèn hoặc ghi được ảnh |
| `uri` | Không có | URI `content://` của ảnh mới |
| Reject khi | Photos lưu ảnh thất bại | Có exception, ví dụ thiếu quyền trên API 28 trở xuống |

Xem [Cài đặt](/vi/guide/installation) để cấu hình quyền.
