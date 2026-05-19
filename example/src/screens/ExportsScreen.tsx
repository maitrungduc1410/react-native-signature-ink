import * as React from 'react';
import { Alert, Image, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  SignatureInk,
  type ExportFormat,
  type SignatureInkHandle,
} from 'react-native-signature-ink';

import {
  Action,
  Screen,
  Section,
  Toggle,
  useScreenStyles,
} from '../ui/ScreenShell';

export default function ExportsScreen() {
  const styles = useScreenStyles();
  const ref = React.useRef<SignatureInkHandle>(null);

  const [format, setFormat] = React.useState<ExportFormat>('png');
  const [trim, setTrim] = React.useState(true);
  const [preview, setPreview] = React.useState<string | null>(null);

  const wrap = async (label: string, fn: () => Promise<unknown>) => {
    try {
      const r = await fn();
      const text = r == null ? '(ok)' : String(r);
      Alert.alert(label, text.length > 200 ? text.slice(0, 200) + '…' : text);
    } catch (e) {
      Alert.alert(`${label} failed`, String(e));
    }
  };

  const onBase64 = () =>
    wrap('toBase64', async () => {
      const b64 = await ref.current?.toBase64({ format, trim });
      if (b64) {
        const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        setPreview(`data:${mime};base64,${b64}`);
      }
      return b64 ? `${b64.length} chars` : null;
    });

  const onFile = () =>
    wrap('toFile', async () =>
      ref.current?.toFile({ format, quality: 0.9, trim })
    );

  const onSvg = async () => {
    try {
      const svg = await ref.current?.toSvg();
      if (svg) {
        Clipboard.setString(svg);
        Alert.alert(
          'SVG copied',
          `${svg.length} chars copied to the clipboard. Paste into a text editor to inspect.`
        );
      } else {
        Alert.alert('toSvg', '(empty)');
      }
    } catch (e) {
      Alert.alert('toSvg failed', String(e));
    }
  };

  const onCopy = () => {
    ref.current?.copyToClipboard();
    Alert.alert('Clipboard', 'Signature copied. Paste in any app to verify.');
  };

  const onPhoto = () =>
    wrap('saveToPhotoLibrary', async () => {
      const r = await ref.current?.saveToPhotoLibrary({ format, trim });
      if (r?.granted === false) {
        return 'permission denied — enable in OS settings';
      }
      return r?.uri ?? 'saved to Photos';
    });

  return (
    <Screen>
      <Text style={styles.title}>Export the signature</Text>
      <Text style={styles.description}>
        Every export honors the same `format` / `quality` / `trim` options. The
        Photos export will prompt the user for permission the first time on iOS
        (`NSPhotoLibraryAddUsageDescription` is required) and writes to
        `Pictures/Signatures` via MediaStore on Android.
      </Text>

      <View style={styles.canvasWrapper}>
        <SignatureInk
          ref={ref}
          style={styles.canvas}
          penColor="#111"
          showBaseline
        />
      </View>

      <Section label="Options">
        <View style={styles.row}>
          <Toggle
            label="format = jpeg"
            value={format === 'jpeg'}
            onChange={(v) => setFormat(v ? 'jpeg' : 'png')}
          />
          <Toggle label="trim to strokes" value={trim} onChange={setTrim} />
        </View>
      </Section>

      <Section label="Imperative API">
        <View style={styles.row}>
          <Action label="toBase64" onPress={onBase64} />
          <Action label="toFile" onPress={onFile} />
          <Action label="toSvg" onPress={onSvg} />
          <Action label="copyToClipboard" onPress={onCopy} />
          <Action label="saveToPhotoLibrary" onPress={onPhoto} />
          <Action
            label="Clear"
            variant="danger"
            onPress={() => {
              ref.current?.clear();
              setPreview(null);
            }}
          />
        </View>
      </Section>

      {preview != null && (
        <View style={styles.previewWrap}>
          <Text style={styles.description}>Preview (base64 round-trip)</Text>
          <Image source={{ uri: preview }} style={styles.preview} />
        </View>
      )}
    </Screen>
  );
}
