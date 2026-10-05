---
description: "Khác biệt của SignatureInk giữa PencilKit trên iOS và renderer riêng trên Android: mực, giá trị mặc định, undo, xuất ảnh, stroke data, toolbar và sự kiện."
---

# iOS và Android

JavaScript API giống nhau trên hai nền tảng, nhưng engine vẽ thì không. iOS giao việc cho PencilKit của Apple. Android dùng một view tự viết, vẽ mỗi nét bằng các đường cong Bezier có độ dày thay đổi theo tốc độ ngón tay. Trang này gom mọi điểm khác biệt vào một chỗ.

## Render {#rendering}

| | iOS | Android |
| --- | --- | --- |
| Engine | `PKCanvasView` của PencilKit | `View` tự viết, vẽ vào bitmap offscreen |
| Độ dày nét | PencilKit tự phản hồi theo lực nhấn và tốc độ. Độ dày của tool là trung điểm của `penMinWidth` và `penMaxWidth`. | `max(penMaxWidth / (velocity + 1), penMinWidth)`, vận tốc tính bằng dp mỗi ms. Chậm thì dày, nhanh thì mảnh. |
| `velocityFilterWeight` | Bị bỏ qua | Làm mượt vận tốc giữa các mẫu (mặc định `0.7`) |
| `defaultInkType` | `pen`, `marker`, `pencil`; `monoline`, `fountainPen`, `watercolor`, `crayon` trên iOS 17+ (bản cũ hơn quay về `pen`) | Bị bỏ qua |
| Bút stylus | Lực nhấn và độ nghiêng của Apple Pencil ảnh hưởng đến nét mực | Được xử lý như ngón tay, trừ khi dùng `pencilOnly` |

### Vì sao Android có renderer riêng {#why-android}

Android không có engine mực hệ thống nào tương đương PencilKit. View trên Android là bản port native của cách tiếp cận dựa trên vận tốc quen thuộc trong các bảng ký tên: mỗi mẫu chạm mới thêm một đoạn Bezier bậc ba dựng từ bốn điểm gần nhất, và độ dày thay đổi dần từ đầu đến cuối mỗi đoạn. Nét vẽ được vẽ vào bitmap, nên nét đã xong không tốn chi phí vẽ lại trong lúc bạn viết tiếp.

Bạn có thể thử phiên bản JavaScript của cùng thuật toán ở trang [Props](/vi/guide/props#try-it).

## Giá trị mặc định {#defaults}

| Prop | iOS | Android |
| --- | --- | --- |
| `penColor` | `black` | `#111111` |
| `toolbarHeight` | `44` | `48` |
| `toolbarTintColor` | Tint color của view (xanh hệ thống) | Màu gốc của từng icon. Xem [Màu toolbar](/vi/guide/toolbar#colors). |
| `baselineColor` | Xám hệ thống, độ mờ 50% | `#80808080` |
| `baselineOffsetFromBottom` | `8` | `16` |
| `baselineWidth` với `baselineStyle="dotted"` | `1.5` | `2` |

Hãy đặt rõ các prop này nếu bạn muốn hai nền tảng trông giống nhau.

## Lịch sử {#history}

| | iOS | Android |
| --- | --- | --- |
| `undo()` hoàn tác gì | Nét cuối, `clear()` hoặc `setStrokeData()` | Nét cuối |
| `clear()` | Undo được | Không undo được; còn làm rỗng redo stack |
| `setStrokeData()` | Undo được | Bản vẽ trước bị mất; `undo()` gỡ từng nét vừa khôi phục |
| Nét mới | Làm rỗng redo stack | Làm rỗng redo stack |

## Xuất ảnh {#exports}

| | iOS | Android |
| --- | --- | --- |
| Nền của PNG | Luôn trong suốt | `backgroundColor` nếu có |
| PNG từ `saveToPhotoLibrary` | Đục, trắng nếu không có `backgroundColor` | `backgroundColor` nếu có, không thì trong suốt |
| Clipboard | PNG trong suốt đã cắt sát qua `UIPasteboard` | PNG đã cắt sát kèm nền qua URI của `FileProvider` |
| Lề khi `trim` | 2 pt | 0.6 × `penMaxWidth` dp + 2 px |
| Đơn vị và độ dày trong SVG | Point, độ dày trung bình mỗi nét | Pixel vật lý, `(penMinWidth + penMaxWidth) / 2` |
| Nơi lưu của `toFile` | Thư mục tạm | Thư mục cache |
| Kết quả `saveToPhotoLibrary` | `{ granted }`; `granted: false` khi bị từ chối quyền | `{ granted, uri }`; `granted: false` khi ghi thất bại |

Chi tiết có ở [Định dạng xuất](/vi/guide/export).

## Stroke data {#stroke-data}

| | iOS | Android |
| --- | --- | --- |
| Toạ độ | Point | dp |
| `t` | Số giây tính từ lúc nét bắt đầu | Mili giây theo uptime của hệ thống |
| Trường bổ sung | `pressure`, `size`, `azimuth`, `altitude` | Không có |
| Độ dày khi khôi phục | `size` của từng điểm | `penMinWidth` và `penMaxWidth` hiện tại |

Xem [Dữ liệu nét vẽ và replay](/vi/guide/stroke-data).

## Đầu vào {#input}

| | iOS | Android |
| --- | --- | --- |
| `pencilOnly` | `drawingPolicy` của PencilKit (iOS 14+). Ngón tay bị bỏ qua. | Chỉ `TOOL_TYPE_STYLUS` vẽ được. Ngón tay và đầu tẩy của stylus bị bỏ qua. |
| Bên trong `ScrollView` | Không xử lý thêm | View yêu cầu view cha không chặn lần chạm khi một nét bắt đầu |
| Lực nhấn | PencilKit có dùng | Không dùng; độ dày chỉ phụ thuộc tốc độ |
| `showToolPicker` | Hiện tool picker của PencilKit | Bị bỏ qua |

## Toolbar {#toolbar}

| | iOS | Android |
| --- | --- | --- |
| Icon | SF Symbols | Vector drawable đi kèm, cùng phong cách |
| Menu overflow | Menu native có icon (iOS 14+), action sheet trên bản cũ hơn | `PopupMenu` chỉ có nhãn |

## Sự kiện {#events}

| | iOS | Android |
| --- | --- | --- |
| `onChange` mỗi nét | Có thể gọi nhiều hơn một lần | Một lần |
| Thứ tự `onChange` và `onEnd` | `onEnd` trước | `onChange` trước |
| Thông điệp lỗi khi render | `Failed to encode image` | `Failed to render bitmap` |
