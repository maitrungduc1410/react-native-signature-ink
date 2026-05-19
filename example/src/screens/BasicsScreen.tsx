import * as React from 'react';
import { Text, View } from 'react-native';
import {
  SignatureInk,
  type SignatureInkHandle,
} from 'react-native-signature-ink';

import {
  Action,
  Screen,
  Section,
  StatusPill,
  useScreenStyles,
} from '../ui/ScreenShell';

export default function BasicsScreen() {
  const styles = useScreenStyles();
  const ref = React.useRef<SignatureInkHandle>(null);
  const [empty, setEmpty] = React.useState(true);
  const [count, setCount] = React.useState(0);

  return (
    <Screen>
      <Text style={styles.title}>Default canvas</Text>
      <Text style={styles.description}>
        Most apps need exactly this: a canvas, the imperative API for undo /
        redo / clear, and a status callback to enable a "Done" button only when
        there are strokes.
      </Text>

      <StatusPill text={empty ? 'empty' : `${count} stroke(s)`} />

      <View style={styles.canvasWrapper}>
        <SignatureInk
          ref={ref}
          style={styles.canvas}
          onChange={(e) => {
            setEmpty(e.isEmpty);
            setCount(e.strokeCount);
          }}
        />
      </View>

      <Section label="Imperative actions">
        <View style={styles.row}>
          <Action label="Undo" onPress={() => ref.current?.undo()} />
          <Action label="Redo" onPress={() => ref.current?.redo()} />
          <Action
            label="Clear"
            variant="danger"
            onPress={() => ref.current?.clear()}
          />
        </View>
      </Section>
    </Screen>
  );
}
