---
description: "Lưu và khôi phục chữ ký dưới dạng stroke data bằng getStrokeData và setStrokeData, hiểu định dạng điểm trên từng nền tảng và tạo animation bằng replay."
---

# Dữ liệu nét vẽ và replay

Ảnh là kết quả cuối cùng. Stroke data chính là bản vẽ: một danh sách các nét, mỗi nét là một danh sách điểm. Dùng nó để lưu bản nháp, khôi phục chữ ký sau khi remount, hoặc tạo animation bằng `replay()`.

```tsx
const data = await ref.current?.getStrokeData(); // StrokeData
await AsyncStorage.setItem('draft', JSON.stringify(data));

// sau đó
const saved = await AsyncStorage.getItem('draft');
if (saved) ref.current?.setStrokeData(JSON.parse(saved));
```

## Định dạng {#format}

```ts
type StrokeData = StrokePoint[][];

interface StrokePoint {
  x: number;
  y: number;
  t: number;
  pressure?: number; // chỉ iOS
  size?: number;     // chỉ iOS
  azimuth?: number;  // chỉ iOS
  altitude?: number; // chỉ iOS
}
```

Canvas trống cho ra `[]`. Ý nghĩa các trường hơi khác nhau giữa hai nền tảng:

| Trường | iOS | Android |
| --- | --- | --- |
| `x`, `y` | Point, lấy từ control point của nét PencilKit | dp (đổi từ pixel), lấy từ các mẫu chạm đã ghi |
| `t` | Số giây tính từ lúc nét bắt đầu | Mili giây theo uptime của hệ thống |
| `pressure` | Lực chạm do PencilKit báo | Không có |
| `size` | Độ dày mực tại điểm đó | Không có |
| `azimuth`, `altitude` | Góc của Apple Pencil, đơn vị radian | Không có |

Vì point và dp đều không phụ thuộc mật độ màn hình, bản vẽ lưu trên thiết bị này sẽ khớp trên thiết bị khác cùng kích thước. Dữ liệu cũng dùng được giữa hai nền tảng, nhưng kết quả sẽ không giống hệt: iOS dùng `size` làm độ dày, còn Android tính lại độ dày từ khoảng thời gian giữa các điểm.

Chỉ so sánh các giá trị `t` trong cùng một nét. Giá trị tuyệt đối không có ý nghĩa.

## Khôi phục {#restoring}

`setStrokeData(data)` thay toàn bộ nội dung canvas và gọi `onChange`. Một số thứ không được lưu trong dữ liệu mà lấy từ props hiện tại:

- **Màu.** Nét khôi phục dùng `penColor` hiện tại trên cả hai nền tảng.
- **Độ dày trên Android.** `penMinWidth` và `penMaxWidth` hiện tại. Trên iOS dùng `size` của từng điểm, nếu thiếu thì dùng `penMaxWidth`.
- **Loại mực trên iOS.** `defaultInkType` hiện tại.

Các trường lạ bị bỏ qua, nên bạn có thể thêm metadata của riêng mình. Nếu giá trị không phân tích được thành stroke data, lệnh gọi bị bỏ qua và canvas giữ nguyên nội dung. Phương thức không trả về gì, nên không có lỗi để bắt.

Cách nó tương tác với undo khác nhau theo nền tảng. Xem [Lịch sử](/vi/guide/methods#history).

## Replay {#replay}

```tsx
ref.current?.replay({ speed: 1.5 });
```

`replay()` xoá view rồi vẽ lại các nét hiện có theo thứ tự, từng điểm một. Nó không thay đổi bản vẽ hay lịch sử undo, và các nét giữ nguyên màu gốc.

- **Thời lượng**: `max(0.5 s, 4 ms × số điểm) / speed`. `speed` mặc định là `1` và không nhỏ hơn `0.05`.
- **Nhịp độ**: các điểm hiện ra với tốc độ đều. Giá trị `t` đã ghi không được dùng, nên các khoảng dừng khi viết thật không được tái hiện.
- **Tiến độ**: [`onReplayProgress`](/vi/guide/events#onreplayprogress) báo từ 0 đến 1 ở mỗi frame.
- **Canvas trống**: không có gì xảy ra và không có tiến độ nào được báo.

### Khi bị ngắt {#interrupting}

Một nét mới, một lệnh `replay()` khác, `undo()`, `redo()`, `clear()` hoặc `setStrokeData()` sẽ dừng animation. Khi đó canvas chỉ giữ lại các nét đã hiện ra tại thời điểm dừng; phần còn lại không được khôi phục. Nếu bạn cho phép người dùng vẽ trong lúc replay, hãy lưu dữ liệu trước:

```tsx
const data = await ref.current?.getStrokeData();
ref.current?.replay();
// nếu replay bị ngắt và bạn muốn lấy lại toàn bộ bản vẽ:
ref.current?.setStrokeData(data ?? []);
```

Unmount view trong lúc replay sẽ dừng nó một cách gọn gàng.
