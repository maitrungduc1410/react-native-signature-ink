# react-native-signature-ink

<div align="center">
  <h3>✍️ True-native signature capture for React Native</h3>

  <p>
    <strong>✅ iOS (PencilKit) & Android</strong> •
    <strong>✅ New Architecture (Fabric)</strong> •
    <strong>✅ Expo development builds</strong>
  </p>

  <p>
    <a href="https://maitrungduc1410.github.io/react-native-signature-ink/"><strong>📖 Documentation</strong></a> •
    <a href="https://maitrungduc1410.github.io/react-native-signature-ink/guide/quick-start">Quick start</a> •
    <a href="https://maitrungduc1410.github.io/react-native-signature-ink/guide/props#try-it">Live demo</a> •
    <a href="https://maitrungduc1410.github.io/react-native-signature-ink/api/">API reference</a> •
    <a href="https://maitrungduc1410.github.io/react-native-signature-ink/vi/">Tiếng Việt</a> •
    <a href="https://maitrungduc1410.github.io/react-native-signature-ink/zh/">简体中文</a>
  </p>
</div>

Signatures drawn by the platform's own ink engine: PencilKit on iOS and a hand-tuned velocity-Bezier renderer in Kotlin on Android. No Skia, no JS canvas, no WebView.

## Demo

| iOS | Android |
| :---: | :---: |
| <video src="https://github.com/user-attachments/assets/296cb656-5614-42d5-b42f-c7c9a656bccb" controls loop muted></video> | <video src="https://github.com/user-attachments/assets/1378bb03-c111-41e8-82a4-8c0db8e5387f" controls loop muted></video> |

## ✨ Features

- **Native ink**: pressure and Apple Pencil support on iOS, speed-sensitive line width on Android
- **Built-in toolbar**: undo, redo, clear and copy, plus custom icon or text buttons and an overflow menu
- **Exports**: PNG or JPEG as base64 or a file, SVG, the system clipboard and the photo library, with optional trimming
- **Stroke data**: save and restore strokes as JSON, and replay them as an animation
- **Signing baseline**: solid, dashed or dotted, anchored to the toolbar edge
- **Stylus-only mode** and the **PencilKit tool picker** (iOS)
- **Fabric-first**: codegen specs, safe view recycling, density-independent sizes everywhere

## Installation

```sh
npm install react-native-signature-ink
# or
yarn add react-native-signature-ink

cd ios && pod install
```

Requires React Native 0.75+ (or Expo SDK 51+) with the New Architecture enabled. Works in Expo development builds and with `expo prebuild`, not in Expo Go. Photo library permissions and Expo setup are covered in the [installation guide](https://maitrungduc1410.github.io/react-native-signature-ink/guide/installation).

## Quick start

```tsx
import { useRef } from 'react';
import { Button, View } from 'react-native';
import { SignatureInk, type SignatureInkHandle } from 'react-native-signature-ink';

export function SignScreen() {
  const ref = useRef<SignatureInkHandle>(null);

  return (
    <View style={{ flex: 1 }}>
      <SignatureInk ref={ref} style={{ height: 240 }} showBaseline showToolbar />
      <Button
        title="Export"
        onPress={async () => {
          const base64 = await ref.current?.toBase64({ format: 'png', trim: true });
          // raw base64, no data: prefix
        }}
      />
    </View>
  );
}
```

## Documentation

Everything else lives on the documentation site: **https://maitrungduc1410.github.io/react-native-signature-ink/**

- [Props](https://maitrungduc1410.github.io/react-native-signature-ink/guide/props), with an in-browser signature pad
- [Ref methods](https://maitrungduc1410.github.io/react-native-signature-ink/guide/methods) and [events](https://maitrungduc1410.github.io/react-native-signature-ink/guide/events)
- [Toolbar](https://maitrungduc1410.github.io/react-native-signature-ink/guide/toolbar)
- [Export formats](https://maitrungduc1410.github.io/react-native-signature-ink/guide/export) and [stroke data](https://maitrungduc1410.github.io/react-native-signature-ink/guide/stroke-data)
- [iOS vs Android](https://maitrungduc1410.github.io/react-native-signature-ink/guide/platform-differences)
- [Troubleshooting](https://maitrungduc1410.github.io/react-native-signature-ink/guide/troubleshooting)
- [API reference](https://maitrungduc1410.github.io/react-native-signature-ink/api/)

A complete demo app is in [`example/`](./example/src/).

## Further reading

- [`ARCHITECTURE.md`](ARCHITECTURE.md): how every piece fits together.
- [`LESSONS_LEARNED.md`](LESSONS_LEARNED.md): bugs we hit while building this and what we learned from them.
- [`AGENTS.md`](AGENTS.md): operational guide for AI agents and new contributors.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md). The docs site source is in [`docs/`](./docs/); run `yarn docs:dev` to work on it.

## Credits

The Android renderer is based on [gcacace/android-signaturepad](https://github.com/gcacace/android-signaturepad) and [warting/android-signaturepad](https://github.com/warting/android-signaturepad).

## License

MIT
