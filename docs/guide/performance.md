---
description: "Performance notes for SignatureInk: what is cheap and what is costly on each platform, large exports, replay, and using signature pads inside lists."
---

# Performance

Drawing itself runs entirely on the native side. Touches are never sent to JavaScript, so ink keeps up with the finger even when the JavaScript thread is busy. The costs that remain are in a few specific operations.

## While drawing {#while-drawing}

- **iOS**: PencilKit renders the ink. There is nothing to tune.
- **Android**: each touch sample draws one short Bezier segment into an offscreen bitmap, and the screen just copies that bitmap. A long signature costs the same per frame as a short one.

The only JavaScript work during a stroke is the event callbacks: `onBegin`, `onEnd` and `onChange`. Keep them light. In particular, avoid exporting on every `onChange`; export when the user confirms.

## Costly operations {#costly-operations}

| Operation | Why it costs more |
| --- | --- |
| Changing `penColor` or `backgroundColor` on Android | The bitmap is reallocated and every stroke is redrawn. Changing the pen widths is cheap. |
| `undo()` and `redo()` on Android | The bitmap is cleared and all remaining strokes are redrawn. |
| `undo()`, `redo()`, `clear()`, `setStrokeData()` on iOS | The PencilKit canvas is rebuilt so its internal history stays consistent. |
| `replay()` on Android | All revealed strokes are redrawn on every frame. Fine for signatures, slower for drawings with thousands of points. |
| Resizing the view on Android | A new bitmap is allocated at the new size and the strokes are redrawn. |

All of these are fast for signature-sized drawings (a few dozen strokes). They only become noticeable if you use the view as a general sketch pad with very large drawings.

## Exports {#exports}

- `toBase64()` builds a string that is about a third larger than the image and crosses to JavaScript in one piece. For full-screen PNGs on a 3× screen that can be several megabytes. Prefer `toFile()` and pass the `file://` URI to your upload code.
- Use `trim: true` to export only the signature area. It is usually much smaller than the full canvas.
- Use `format: 'jpeg'` with a `quality` around `0.8` when you do not need transparency.
- `toSvg()` and `getStrokeData()` are small and fast; they do not render pixels.

## Lists {#lists}

Each `SignatureInk` owns a native canvas (and on Android a bitmap the size of the view). A few per screen are fine. For long lists:

- Pass `removeClippedSubviews={false}` to `FlatList`. Detaching and reattaching native drawing views this way is unreliable, especially on Android.
- Rows that scroll far away are unmounted and lose their drawing. Store each row's stroke data (for example from `onEnd` with `getStrokeData()`) and restore it with `setStrokeData()` when the row mounts again.
- Prefer showing a static image (from `toFile()`) for rows that are not being edited, and mount the live pad only for the row the user is signing.

See the example app's FlatList screen in the repository for a working version.

## Replay {#replay}

Replay duration grows with the number of points (4 ms each, at least 0.5 s). For a long drawing, pass a higher `speed` instead of letting the replay run for many seconds.
