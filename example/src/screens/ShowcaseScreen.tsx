import * as React from 'react';
import { Alert, Image, Platform, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  SignatureInk,
  type SignatureInkHandle,
  type StrokeData,
} from 'react-native-signature-ink';

import {
  Action,
  Screen,
  Section,
  StatusPill,
  Toggle,
  useScreenStyles,
} from '../ui/ScreenShell';

/**
 * One-screen showcase of the most common pieces of the library: the
 * native toolbar (inside the canvas), a baseline guide, every export
 * shape, the stroke-data round-trip, and replay. Mirrors the demo we
 * shipped before the example app was split across screens — handy as a
 * single "look what it can do" surface for screenshots and recordings.
 */
export default function ShowcaseScreen() {
  const styles = useScreenStyles();
  const ref = React.useRef<SignatureInkHandle>(null);

  const [empty, setEmpty] = React.useState(true);
  const [count, setCount] = React.useState(0);
  const [baseline, setBaseline] = React.useState(true);
  const [toolPicker, setToolPicker] = React.useState(false);
  const [captured, setCaptured] = React.useState<StrokeData | null>(null);
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
    wrap('PNG → base64', async () => {
      const b64 = await ref.current?.toBase64({ format: 'png', trim: true });
      if (b64) {
        setPreview(`data:image/png;base64,${b64}`);
      }
      return b64 ? `${b64.length} chars` : null;
    });

  const onFile = () =>
    wrap('JPEG → file', async () =>
      ref.current?.toFile({ format: 'jpeg', quality: 0.9, trim: true })
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
        Alert.alert('SVG', '(empty)');
      }
    } catch (e) {
      Alert.alert('SVG failed', String(e));
    }
  };

  const onCapture = () =>
    wrap('Get stroke data', async () => {
      const data = (await ref.current?.getStrokeData()) ?? [];
      console.log(111111, 'Captured stroke data', data);
      setCaptured(data);
      const totalPoints = data.reduce((n, s) => n + s.length, 0);
      return `${data.length} stroke(s), ${totalPoints} control point(s)`;
    });

  const onRestore = () => {
    if (!captured) {
      Alert.alert('Nothing captured yet', 'Tap "Get stroke data" first.');
      return;
    }
    ref.current?.setStrokeData(captured);
  };

  const onReplay = () => ref.current?.replay({ speed: 1 });

  const onIsEmpty = () =>
    wrap('isEmpty()', async () => {
      const result = await ref.current?.isEmpty();
      return String(result);
    });

  const onClear = () => {
    ref.current?.clear();
    setPreview(null);
  };

  // PKToolPicker floats over the bottom of the screen (~220pt collapsed
  // + safe-area). Add headroom so the export preview rendered at the
  // bottom of the scroll content stays reachable by scrolling.
  const extraBottomForToolPicker =
    Platform.OS === 'ios' && toolPicker ? { paddingBottom: 260 } : undefined;

  return (
    <Screen contentStyle={extraBottomForToolPicker}>
      <Text style={styles.title}>react-native-signature-ink</Text>
      <StatusPill text={empty ? 'Empty' : `${count} stroke(s)`} />

      <View style={styles.canvasWrapper}>
        <SignatureInk
          ref={ref}
          style={styles.canvas}
          showBaseline={baseline}
          showToolbar
          showToolPicker={Platform.OS === 'ios' && toolPicker}
          onChange={(e) => {
            setEmpty(e.isEmpty);
            setCount(e.strokeCount);
          }}
        />
      </View>

      <Section>
        <View style={styles.row}>
          {Platform.OS === 'ios' && (
            <Toggle
              label="Tool picker (iOS)"
              value={toolPicker}
              onChange={setToolPicker}
            />
          )}
          <Toggle label="Baseline" value={baseline} onChange={setBaseline} />
        </View>
      </Section>

      <Section>
        <View style={styles.row}>
          <Action label="PNG → base64" onPress={onBase64} />
          <Action label="JPEG → file" onPress={onFile} />
          <Action label="SVG" onPress={onSvg} />
        </View>
        <View style={styles.row}>
          <Action label="Get stroke data" onPress={onCapture} />
          <Action
            label="Set stroke data"
            onPress={onRestore}
            disabled={!captured}
          />
          <Action label="Replay" onPress={onReplay} />
        </View>
        <View style={styles.row}>
          <Action label="isEmpty()" onPress={onIsEmpty} />
          <Action label="Clear" variant="danger" onPress={onClear} />
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
