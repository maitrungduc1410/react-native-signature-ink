---
description: "The SignatureInk ref API: clear, undo, redo, copy, replay, stroke data and Promise-based exports, with timing, history and error rules."
---

# Ref methods

Attach a ref typed as `SignatureInkHandle` to call methods on the native view.

```tsx
import { useRef } from 'react';
import { SignatureInk, type SignatureInkHandle } from 'react-native-signature-ink';

const ref = useRef<SignatureInkHandle>(null);

<SignatureInk ref={ref} style={{ height: 240 }} />;

ref.current?.undo();
const empty = await ref.current?.isEmpty();
```

## Overview {#overview}

| Method | Returns | What it does |
| --- | --- | --- |
| `clear()` | `void` | Removes every stroke. |
| `undo()` | `void` | Steps back one history entry. |
| `redo()` | `void` | Re-applies the last undone entry. |
| `copyToClipboard()` | `void` | Puts a trimmed PNG on the system clipboard. |
| `replay(options?)` | `void` | Animates the strokes again. |
| `setStrokeData(data)` | `void` | Replaces the drawing with saved strokes. |
| `isEmpty()` | `Promise<boolean>` | `true` when there are no strokes. |
| `toBase64(options?)` | `Promise<string>` | PNG or JPEG as raw base64. |
| `toFile(options?)` | `Promise<string>` | PNG or JPEG written to a file, as a `file://` URI. |
| `toSvg()` | `Promise<string>` | An SVG document. |
| `getStrokeData()` | `Promise<StrokeData>` | The strokes as JSON-friendly data. |
| `saveToPhotoLibrary(options?)` | `Promise<SavedToPhotoLibraryResult>` | Saves an image to Photos or the gallery. |

The export methods are described in [Export formats](/guide/export), and `getStrokeData`, `setStrokeData` and `replay` in [Stroke data and replay](/guide/stroke-data).

## Undo, redo and clear {#history}

The history model is not the same on both platforms:

| | iOS | Android |
| --- | --- | --- |
| What `undo()` reverts | The last stroke, `clear()` or `setStrokeData()` | The last stroke |
| `clear()` | Can be undone | Cannot be undone; also empties the redo stack |
| `setStrokeData()` | Can be undone | The previous drawing is gone; `undo()` removes the restored strokes one by one |
| A new stroke | Empties the redo stack | Empties the redo stack |

`undo()` and `redo()` do nothing when there is nothing to undo or redo. If you need the same behavior on both platforms, for example a reversible "Clear" button, keep your own copy with `getStrokeData()` before clearing and restore it with `setStrokeData()`.

## Replay {#replay}

```tsx
ref.current?.replay();               // natural pace
ref.current?.replay({ speed: 2 });   // twice as fast
```

The base duration is about 4 ms per captured point, with a minimum of 0.5 s, divided by `speed`. `speed` defaults to `1` and is clamped to at least `0.05`. Calling `replay()` on an empty canvas does nothing. More in [Stroke data and replay](/guide/stroke-data#replay).

## When methods run {#timing}

- Methods that return `void` do nothing if the native view is not mounted yet.
- Methods that return a Promise reject with `SignatureInk: native view is not mounted yet` if you call them before mount.
- If the component unmounts while a Promise is pending, it rejects with `SignatureInk unmounted`.
- Native failures reject with the native message, for example `Failed to encode image` (iOS) or `Failed to render bitmap` (Android, when the view has not been laid out yet).

So wrap exports in `try`/`catch`, especially in lists where rows can unmount at any time:

```tsx
try {
  const uri = await ref.current?.toFile({ format: 'jpeg', quality: 0.9 });
} catch (e) {
  // the view unmounted or the export failed
}
```

## Toolbar buttons call the same code {#toolbar-buttons}

Tapping the built-in undo, redo, clear or copy button runs exactly the same native code as the matching ref method, then fires [`onToolbarAction`](/guide/events#ontoolbaraction).
