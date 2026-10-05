---
description: "Native signature capture for React Native: PencilKit on iOS, a velocity-Bezier renderer on Android, a native toolbar, and PNG, JPEG and SVG export."
layout: home

hero:
  name: React Native Signature Ink
  text: Signatures drawn by the platform's own ink
  tagline: PencilKit on iOS, a hand-tuned velocity-Bezier renderer on Android. One Fabric component with a native toolbar, a typed ref API and PNG, JPEG, SVG and stroke-data export. No Skia, no WebView.
  actions:
    - theme: brand
      text: Get started
      link: /guide/quick-start
    - theme: alt
      text: Try it in the browser
      link: /guide/props#try-it
    - theme: alt
      text: API reference
      link: /api/

features:
  - icon: ✍️
    title: Truly native ink
    details: iOS draws with PencilKit, with pressure and Apple Pencil support. Android runs a Kotlin velocity-Bezier renderer that thins the line as the pen speeds up.
    link: /guide/platform-differences
    linkText: iOS vs Android
  - icon: 🧰
    title: Built-in toolbar
    details: Undo, redo, clear and copy out of the box, plus custom icon or text buttons and an automatic overflow menu.
    link: /guide/toolbar
    linkText: Toolbar
  - icon: 🖼️
    title: Real exports
    details: PNG or JPEG as base64 or a file, SVG, the system clipboard and the photo library, with optional trimming to the signature.
    link: /guide/export
    linkText: Export formats
  - icon: 🔁
    title: Stroke data and replay
    details: Save the strokes as JSON, restore them later and replay the signature as an animation at any speed.
    link: /guide/stroke-data
    linkText: Stroke data
  - icon: ⚡
    title: Fabric-first
    details: Built on the New Architecture with codegen specs. Drawing never touches the JS thread, and views recycle cleanly between screens.
    link: /guide/performance
    linkText: Performance
  - icon: 📏
    title: Same size everywhere
    details: Every width and offset is in points or dp, so a signature looks the same on every screen density and on both platforms.
    link: /guide/props
    linkText: Props
---

<div class="home-section vp-doc">

## Install

::: code-group

```sh [npm]
npm install react-native-signature-ink
```

```sh [yarn]
yarn add react-native-signature-ink
```

```sh [Expo]
npx expo install react-native-signature-ink
npx expo prebuild
```

:::

Then run `pod install` in `ios/`. The component needs the New Architecture. See [Installation](/guide/installation) for permissions and Expo details.

## Capture and export in a few lines

```tsx
import { useRef } from 'react';
import { SignatureInk, type SignatureInkHandle } from 'react-native-signature-ink';

const ref = useRef<SignatureInkHandle>(null);

<SignatureInk ref={ref} style={{ height: 240 }} showBaseline showToolbar />;

const png = await ref.current?.toBase64({ trim: true }); // raw base64, no data: prefix
```

## See it on a device

<div class="demo-videos">
  <figure>
    <video src="https://github.com/user-attachments/assets/296cb656-5614-42d5-b42f-c7c9a656bccb" controls loop muted playsinline preload="metadata" aria-label="SignatureInk running on iOS"></video>
    <figcaption>iOS</figcaption>
  </figure>
  <figure>
    <video src="https://github.com/user-attachments/assets/1378bb03-c111-41e8-82a4-8c0db8e5387f" controls loop muted playsinline preload="metadata" aria-label="SignatureInk running on Android"></video>
    <figcaption>Android</figcaption>
  </figure>
</div>

</div>
