---
description: "Add a native signature pad to a React Native screen, check whether the user has signed and export the signature as a trimmed PNG."
---

# Quick start

This page builds a small signing screen: a pad with a baseline and the built-in toolbar, a Save button that only turns on once there is a signature, and a PNG export.

## 1. Render the pad {#render-the-pad}

`SignatureInk` has no intrinsic size. Give it a height (or `flex: 1`) through `style`.

```tsx
import { useRef, useState } from 'react';
import { Button, View } from 'react-native';
import { SignatureInk, type SignatureInkHandle } from 'react-native-signature-ink';

export function SignScreen() {
  const ref = useRef<SignatureInkHandle>(null);
  const [signed, setSigned] = useState(false);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <SignatureInk
        ref={ref}
        style={{ height: 240 }}
        showBaseline
        showToolbar
        penColor="#111111"
        onChange={(e) => setSigned(!e.isEmpty)}
      />
      <Button title="Save" disabled={!signed} onPress={save} />
    </View>
  );

  async function save() {
    // see step 2
  }
}
```

- `showBaseline` draws the dashed signing line.
- `showToolbar` adds the native undo, redo, clear and copy buttons. See [Toolbar](/guide/toolbar).
- `onChange` fires whenever the drawing changes, with `{ isEmpty, strokeCount }`. See [Events](/guide/events).

## 2. Export the signature {#export-the-signature}

Every export method is on the ref and returns a Promise.

```tsx
async function save() {
  const base64 = await ref.current?.toBase64({ format: 'png', trim: true });
  if (!base64) return;
  await upload(`data:image/png;base64,${base64}`); // your own upload
}
```

`toBase64()` returns the raw base64 payload without a `data:` prefix. `trim: true` crops the image to the signature instead of the whole canvas. For large images, [`toFile()`](/guide/export#file) avoids sending a long string across to JavaScript.

## 3. Use your own buttons instead {#use-your-own-buttons}

Leave out `showToolbar` and call the ref methods from your own UI:

```tsx
<View style={{ flexDirection: 'row', gap: 8 }}>
  <Button title="Undo" onPress={() => ref.current?.undo()} />
  <Button title="Clear" onPress={() => ref.current?.clear()} />
</View>
```

The full list is in [Ref methods](/guide/methods).

## 4. Dark backgrounds {#dark-backgrounds}

The canvas is transparent by default, so your view's background shows through. On a dark screen, pick a light pen and a light toolbar tint:

```tsx
<SignatureInk
  backgroundColor="#0c0c0c"
  penColor="#ffffff"
  baselineColor="rgba(255,255,255,0.4)"
  toolbarTintColor="#ffffff"
  showBaseline
  showToolbar
/>
```

On iOS the ink color is used exactly as given; PencilKit does not invert it in dark mode, on screen or in exports.

## Next steps {#next-steps}

- [Every prop, with a live preview](/guide/props)
- [Export formats](/guide/export)
- [Save and restore strokes](/guide/stroke-data)
