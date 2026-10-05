---
description: "Save and restore a signature as stroke data with getStrokeData and setStrokeData, understand the point format per platform, and animate it with replay."
---

# Stroke data and replay

Images are the final output. Stroke data is the drawing itself: a list of strokes, each a list of points. Use it to save a draft, restore a signature after a remount, or animate it with `replay()`.

```tsx
const data = await ref.current?.getStrokeData(); // StrokeData
await AsyncStorage.setItem('draft', JSON.stringify(data));

// later
const saved = await AsyncStorage.getItem('draft');
if (saved) ref.current?.setStrokeData(JSON.parse(saved));
```

## Format {#format}

```ts
type StrokeData = StrokePoint[][];

interface StrokePoint {
  x: number;
  y: number;
  t: number;
  pressure?: number; // iOS only
  size?: number;     // iOS only
  azimuth?: number;  // iOS only
  altitude?: number; // iOS only
}
```

An empty canvas gives `[]`. The fields mean slightly different things per platform:

| Field | iOS | Android |
| --- | --- | --- |
| `x`, `y` | Points, from the PencilKit stroke's control points | dp (converted from pixels), from the captured touch samples |
| `t` | Seconds since the stroke started | Milliseconds of system uptime |
| `pressure` | Touch force as reported by PencilKit | Not included |
| `size` | Width of the ink at that point | Not included |
| `azimuth`, `altitude` | Apple Pencil angles in radians | Not included |

Because points and dp are both density-independent, a drawing saved on one device lines up on another of the same size. Data moves between platforms too, but the result will not look identical: iOS uses `size` for the width, Android recomputes the width from the time between points.

Only compare `t` values within one stroke. The absolute numbers are not meaningful.

## Restoring {#restoring}

`setStrokeData(data)` replaces whatever is on the canvas and fires `onChange`. A few things are not stored in the data and come from the current props instead:

- **Color.** Restored strokes use the current `penColor` on both platforms.
- **Width on Android.** The current `penMinWidth` and `penMaxWidth`. On iOS the per-point `size` is used, falling back to `penMaxWidth` when it is missing.
- **Ink type on iOS.** The current `defaultInkType`.

Unknown fields are ignored, so you can add your own metadata. If the value cannot be parsed as stroke data, the call is ignored and the canvas keeps its content. The method returns nothing, so there is no error to catch.

How it interacts with undo differs by platform. See [History](/guide/methods#history).

## Replay {#replay}

```tsx
ref.current?.replay({ speed: 1.5 });
```

`replay()` clears the view and redraws the current strokes in order, point by point. It does not change the drawing or the undo history, and strokes keep their original colors.

- **Duration**: `max(0.5 s, 4 ms × number of points) / speed`. `speed` defaults to `1` and is clamped to at least `0.05`.
- **Pacing**: points are revealed at a constant rate. The recorded `t` values are not used, so pauses in the original writing are not reproduced.
- **Progress**: [`onReplayProgress`](/guide/events#onreplayprogress) reports 0 to 1 on every frame.
- **Empty canvas**: nothing happens and no progress is reported.

### Interrupting {#interrupting}

A new stroke, another `replay()`, `undo()`, `redo()`, `clear()` or `setStrokeData()` stops the animation. The canvas then keeps only the strokes that had been revealed when it stopped; the rest are not restored. If you let users draw during a replay, save the data first:

```tsx
const data = await ref.current?.getStrokeData();
ref.current?.replay();
// if the replay gets interrupted and you want the full drawing back:
ref.current?.setStrokeData(data ?? []);
```

Unmounting the view during a replay stops it cleanly.
