import * as React from 'react';
import { Alert, Text, View } from 'react-native';
import {
  SignatureInk,
  type SignatureInkHandle,
  type StrokeData,
} from 'react-native-signature-ink';

import {
  Action,
  NumberKnob,
  Screen,
  Section,
  StatusPill,
  useScreenStyles,
} from '../ui/ScreenShell';

export default function StrokeDataScreen() {
  const styles = useScreenStyles();
  const ref = React.useRef<SignatureInkHandle>(null);

  const [captured, setCaptured] = React.useState<StrokeData | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [speedX10, setSpeedX10] = React.useState(10); // stored x10 to step in 0.5

  const capture = async () => {
    try {
      const data = (await ref.current?.getStrokeData()) ?? [];
      setCaptured(data);
      const totalPoints = data.reduce((n, s) => n + s.length, 0);
      Alert.alert(
        'Captured',
        `${data.length} stroke(s), ${totalPoints} control point(s)`
      );
    } catch (e) {
      Alert.alert('getStrokeData failed', String(e));
    }
  };

  const restore = () => {
    if (!captured) {
      Alert.alert('Nothing captured yet');
      return;
    }
    ref.current?.setStrokeData(captured);
  };

  const replay = () => {
    setProgress(0);
    ref.current?.replay({ speed: speedX10 / 10 });
  };

  return (
    <Screen>
      <Text style={styles.title}>Stroke data round-trip & replay</Text>
      <Text style={styles.description}>
        `getStrokeData()` returns the canvas as JSON-serializable points
        (PencilKit control points + pressure on iOS, MotionEvent samples on
        Android). Send it back through `setStrokeData()` and you can replay it
        on any device.
      </Text>

      <StatusPill
        text={
          captured
            ? `captured ${captured.length} stroke(s) · replay ${(progress * 100).toFixed(0)}%`
            : `replay ${(progress * 100).toFixed(0)}%`
        }
      />

      <View style={styles.canvasWrapper}>
        <SignatureInk
          ref={ref}
          style={styles.canvas}
          showBaseline
          onReplayProgress={(e) => setProgress(e.progress)}
        />
      </View>

      <Section label="Capture / restore">
        <View style={styles.row}>
          <Action label="Get stroke data" onPress={capture} />
          <Action
            label="Set stroke data"
            onPress={restore}
            disabled={!captured}
          />
          <Action
            label="Clear"
            variant="danger"
            onPress={() => {
              ref.current?.clear();
              setProgress(0);
            }}
          />
        </View>
      </Section>

      <Section label="Replay">
        <NumberKnob
          label="speed"
          value={speedX10}
          min={1}
          max={40}
          step={5}
          format={(v) => `${(v / 10).toFixed(1)}×`}
          onChange={setSpeedX10}
        />
        <View style={styles.row}>
          <Action label="Replay" onPress={replay} />
        </View>
      </Section>
    </Screen>
  );
}
