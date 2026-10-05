---
description: "Các sự kiện của SignatureInk: onBegin, onEnd, onChange kèm isEmpty và strokeCount, onReplayProgress, onToolbarAction và thời điểm chúng được gọi."
---

# Sự kiện

Mọi sự kiện đều là callback prop bình thường trên `<SignatureInk />`.

| Prop | Payload | Được gọi khi |
| --- | --- | --- |
| `onBegin` | không có | Ngón tay hoặc bút chạm xuống và một nét bắt đầu. |
| `onEnd` | không có | Ngón tay hoặc bút nhấc lên và nét được ghi nhận. |
| `onChange` | `{ isEmpty, strokeCount }` | Bản vẽ thay đổi. |
| `onReplayProgress` | `{ progress }` | Mỗi frame trong lúc `replay()` chạy. |
| `onToolbarAction` | `{ id }` | Một nút toolbar hoặc mục trong menu overflow được chạm. |

## onBegin và onEnd {#onbegin-onend}

```tsx
<SignatureInk
  onBegin={() => setHint(null)}
  onEnd={() => saveDraft()}
/>
```

`onBegin` chỉ được gọi với đầu vào được phép vẽ, nên khi bật [`pencilOnly`](/vi/guide/props#input) thì chạm bằng ngón tay sẽ không kích hoạt nó. Khi `onEnd` được gọi, nét vẽ đã là một phần của bản vẽ, nên `getStrokeData()` và các phương thức xuất đều có nét đó.

## onChange {#onchange}

```tsx
<SignatureInk onChange={({ isEmpty, strokeCount }) => setSigned(!isEmpty)} />
```

`onChange` được gọi sau khi một nét kết thúc, và sau `undo()`, `redo()`, `clear()` và `setStrokeData()`, kể cả khi các hành động này đến từ toolbar. Nó không được gọi theo từng frame của replay.

Hãy coi nó là tín hiệu "bản vẽ có thể đã thay đổi" và đọc payload, thay vì đếm số lần gọi:

- Trên iOS nó có thể được gọi nhiều hơn một lần cho cùng một nét.
- Thứ tự so với `onEnd` khác nhau: Android gọi `onChange` trước `onEnd`, iOS gọi sau.
- `clear()` vẫn gọi nó kể cả khi canvas đã trống.

`onChange` là cách rẻ nhất để bật hoặc tắt nút Lưu. `isEmpty()` cho cùng câu trả lời khi bạn cần, dưới dạng Promise.

## onReplayProgress {#onreplayprogress}

```tsx
<SignatureInk onReplayProgress={({ progress }) => setProgress(progress)} />
```

`progress` đi từ 0 đến 1 trong suốt thời lượng replay. Nó được gọi ở mỗi frame hiển thị, nên tránh xử lý nặng trong handler. Replay chạy hết luôn báo `1` cuối cùng; replay bị ngắt (bởi một nét mới, một lệnh `replay()` khác, `undo()`, `redo()`, `clear()` hoặc `setStrokeData()`) sẽ dừng mà không đến `1`.

## onToolbarAction {#ontoolbaraction}

```tsx
<SignatureInk
  showToolbar
  toolbarButtons={[{ id: 'undo' }, { id: 'save', icon: 'save', text: 'Lưu' }]}
  onToolbarAction={({ id }) => {
    if (id === 'save') save();
  }}
/>
```

`id` là `id` của mục được chạm. Với các id có sẵn (`undo`, `redo`, `clear`, `copy`), hành động native đã chạy xong khi callback được gọi. Id tuỳ chỉnh không có hành vi native; callback này là nơi bạn xử lý chúng. Chạm vào mục trong menu overflow cũng gọi callback này.

Payload còn có trường `action` với cùng giá trị. Trường này đã deprecated; hãy dùng `id`.

## Tên phía native {#native-names}

Nếu bạn dùng `SignatureInkView` thô, sự kiện thay đổi có tên `onStrokesChange` (React Native core đã đăng ký `topChange` cho `TextInput` và `Switch`), payload của toolbar là `{ itemId, action }`, và kết quả Promise đi qua một sự kiện nội bộ `onResult`. `SignatureInk` chuyển đổi tất cả sang các prop ở trên.
