---
description: "Export a signature as PNG or JPEG base64 or file, as SVG, to the clipboard or the photo library, with trimming, quality and background rules."
---

# Export formats

| Method | Output | Trim default |
| --- | --- | --- |
| [`toBase64(options?)`](#base64) | PNG or JPEG, raw base64 string | `false` |
| [`toFile(options?)`](#file) | PNG or JPEG file, `file://` URI | `false` |
| [`toSvg()`](#svg) | SVG document string | always cropped |
| [`copyToClipboard()`](#clipboard) | PNG on the system clipboard | always trimmed |
| [`saveToPhotoLibrary(options?)`](#photo-library) | PNG or JPEG in Photos or the gallery | `true` |
| [`getStrokeData()`](/guide/stroke-data) | The raw strokes as JSON-friendly data | |

## Image options {#options}

`toBase64`, `toFile` and `saveToPhotoLibrary` take the same options:

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `format` | `'png' \| 'jpeg'` | `'png'` | PNG is lossless with alpha. JPEG is smaller and has no alpha. |
| `quality` | `number` | `1` | 0 to 1, JPEG only. Ignored for PNG. |
| `trim` | `boolean` | `false` (`true` for `saveToPhotoLibrary`) | Crop to the signature instead of the whole canvas. |

Images are rendered at the screen's pixel density: a 300×150 pt view on a 3× iPhone gives a 900×450 px image, and on Android the size is the view's size in physical pixels.

`trim` crops to the bounding box of the strokes plus a small margin (2 pt on iOS; on Android 0.6 × `penMaxWidth` dp plus 2 px, kept inside the view). On an empty canvas you get the full canvas.

## Backgrounds {#backgrounds}

What ends up behind the ink depends on the format, the destination and the platform:

| Export | iOS | Android |
| --- | --- | --- |
| PNG from `toBase64` / `toFile` | Always transparent | `backgroundColor` if set, otherwise transparent |
| JPEG (any method) | `backgroundColor`, or white if transparent | `backgroundColor`, or white if transparent |
| `copyToClipboard()` | Transparent | `backgroundColor` if set, otherwise transparent |
| PNG from `saveToPhotoLibrary` | Always opaque: `backgroundColor`, or white | `backgroundColor` if set, otherwise transparent |

iOS always saves an opaque image to Photos because the Photos viewer shows transparent images on black, which makes dark ink unreadable. If you want the same opaque result on Android, set `backgroundColor` or use `format: 'jpeg'`.

The [baseline](/guide/props#baseline) and the [toolbar](/guide/toolbar) are never part of an export.

## Base64 {#base64}

```tsx
const base64 = await ref.current?.toBase64({ format: 'png', trim: true });
const dataUri = `data:image/png;base64,${base64}`;
```

The string has no `data:` prefix and no line breaks. Base64 is about a third larger than the binary image and crosses to JavaScript as one string, so prefer `toFile()` for full-resolution images you are going to upload anyway.

## File {#file}

```tsx
const uri = await ref.current?.toFile({ format: 'jpeg', quality: 0.85 });
// file:///.../signature-1728100000000.jpg
```

The file is written to the app's temporary directory on iOS and to the cache directory on Android, named `signature-<timestamp>.png` or `.jpg`. The library never deletes these files. Move them somewhere permanent or delete them when you are done.

## SVG {#svg}

```tsx
const svg = await ref.current?.toSvg();
```

The SVG contains one `<path>` per stroke, built from the stroke's points as straight segments, with the stroke color as a hex value and round caps and joins. The `viewBox` is cropped to the strokes. Keep in mind:

- **Each path has a single width.** On iOS it is the average width of the stroke's points; on Android it is the midpoint of `penMinWidth` and `penMaxWidth`. The thick and thin parts of the on-screen ink are not reproduced.
- **Units differ.** iOS uses points; Android uses physical pixels, so the numbers in an Android SVG are larger on high-density screens. Scale the SVG through its `viewBox` rather than relying on its `width` and `height`.
- On Android a single tap (a dot) becomes a `<circle>`.
- Colors are written without alpha.

If you need exact geometry for your own rendering, use [`getStrokeData()`](/guide/stroke-data), which uses points or dp on both platforms.

## Clipboard {#clipboard}

```tsx
ref.current?.copyToClipboard();
```

Copies a trimmed PNG. It returns nothing and does not report errors. On an empty canvas it copies a blank image, so check `isEmpty()` first if that matters.

- **iOS** sets `UIPasteboard.general.image`.
- **Android** writes `signature-clipboard.png` to the cache directory and puts a `content://` URI from the bundled `FileProvider` on the clipboard. It also grants the system UI read access so the Android 13+ clipboard preview can show a thumbnail.

The built-in toolbar's copy button calls the same code.

## Photo library {#photo-library}

```tsx
const result = await ref.current?.saveToPhotoLibrary({ format: 'png' });
if (result && !result.granted) {
  // iOS: the user denied access
}
```

The Promise resolves with `{ granted, uri? }`:

| | iOS | Android |
| --- | --- | --- |
| Permission | Asks for "Add to Photos" access the first time. Needs `NSPhotoLibraryAddUsageDescription`. | None on API 29+. API 28 and older need `WRITE_EXTERNAL_STORAGE`. |
| Where | The Photos library, keeping the PNG or JPEG format | `Pictures/Signatures/` through MediaStore (on API 29+) |
| `granted: false` | The user denied or restricted access | The image could not be inserted or written |
| `uri` | Not set | The `content://` URI of the new image |
| Rejects when | Photos fails to save the image | An exception is thrown, for example a missing permission on API 28 and older |

See [Installation](/guide/installation) for the permission setup.
