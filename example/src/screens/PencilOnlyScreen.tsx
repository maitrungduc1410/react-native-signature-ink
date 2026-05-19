import * as React from 'react';
import { Platform, Text, View } from 'react-native';
import { SignatureInk } from 'react-native-signature-ink';

import { Screen, Section, Toggle, useScreenStyles } from '../ui/ScreenShell';

export default function PencilOnlyScreen() {
  const styles = useScreenStyles();
  const [pencilOnly, setPencilOnly] = React.useState(true);

  return (
    <Screen>
      <Text style={styles.title}>Pencil-only input</Text>
      <Text style={styles.description}>
        When `pencilOnly` is on, the canvas rejects finger touches and only
        accepts pen input — on iPad that's an Apple Pencil
        (`PKCanvasViewDrawingPolicy.pencilOnly`); on Android any active stylus
        reporting `TOOL_TYPE_STYLUS`. On a phone with no stylus this looks like
        the canvas is dead — that's expected.
        {Platform.OS === 'ios' ? '' : ''}
      </Text>

      <View style={styles.canvasWrapper}>
        <SignatureInk
          style={styles.canvas}
          pencilOnly={pencilOnly}
          showBaseline
        />
      </View>

      <Section label="Controls">
        <Toggle
          label="pencilOnly"
          value={pencilOnly}
          onChange={setPencilOnly}
        />
      </Section>
    </Screen>
  );
}
