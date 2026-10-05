---
description: "SignatureInk events: onBegin, onEnd, onChange with isEmpty and strokeCount, onReplayProgress and onToolbarAction, and when each one fires."
---

# Events

All events are plain callback props on `<SignatureInk />`.

| Prop | Payload | Fires when |
| --- | --- | --- |
| `onBegin` | none | A finger or pen touches down and a stroke starts. |
| `onEnd` | none | The finger or pen lifts and the stroke is committed. |
| `onChange` | `{ isEmpty, strokeCount }` | The drawing changes. |
| `onReplayProgress` | `{ progress }` | Every frame while `replay()` runs. |
| `onToolbarAction` | `{ id }` | A toolbar button or overflow menu item is tapped. |

## onBegin and onEnd {#onbegin-onend}

```tsx
<SignatureInk
  onBegin={() => setHint(null)}
  onEnd={() => saveDraft()}
/>
```

`onBegin` only fires for input that is allowed to draw, so with [`pencilOnly`](/guide/props#input) finger touches do not trigger it. When `onEnd` fires the stroke is already part of the drawing, so `getStrokeData()` and the export methods include it.

## onChange {#onchange}

```tsx
<SignatureInk onChange={({ isEmpty, strokeCount }) => setSigned(!isEmpty)} />
```

`onChange` fires after a stroke ends, and after `undo()`, `redo()`, `clear()` and `setStrokeData()`, including the same actions from the toolbar. It does not fire for each frame of a replay.

Treat it as "the drawing may have changed" and read the payload, rather than counting calls:

- On iOS it can fire more than once for the same stroke.
- The order relative to `onEnd` differs: Android fires `onChange` before `onEnd`, iOS after it.
- `clear()` fires it even when the canvas was already empty.

`onChange` is the cheapest way to enable or disable a Save button. `isEmpty()` gives the same answer on demand, as a Promise.

## onReplayProgress {#onreplayprogress}

```tsx
<SignatureInk onReplayProgress={({ progress }) => setProgress(progress)} />
```

`progress` goes from 0 to 1 over the replay duration. It fires on every display frame, so avoid heavy work in the handler. A replay that runs to the end always reports `1` last; a replay that is interrupted (by a new stroke, another `replay()`, `undo()`, `redo()`, `clear()` or `setStrokeData()`) stops without reaching `1`.

## onToolbarAction {#ontoolbaraction}

```tsx
<SignatureInk
  showToolbar
  toolbarButtons={[{ id: 'undo' }, { id: 'save', icon: 'save', text: 'Save' }]}
  onToolbarAction={({ id }) => {
    if (id === 'save') save();
  }}
/>
```

`id` is the `id` of the tapped item. For the built-in ids (`undo`, `redo`, `clear`, `copy`) the native action has already run when the callback fires. Custom ids have no native behavior; this callback is where you handle them. Taps on items in the overflow menu fire it too.

The payload also has an `action` field with the same value. It is deprecated; use `id`.

## Names on the native side {#native-names}

If you use the raw `SignatureInkView`, the change event is called `onStrokesChange` (React Native core already registers `topChange` for `TextInput` and `Switch`), the toolbar payload is `{ itemId, action }`, and Promise results arrive through an internal `onResult` event. `SignatureInk` maps all of this to the props above.
