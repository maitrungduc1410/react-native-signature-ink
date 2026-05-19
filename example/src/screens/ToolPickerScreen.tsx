import * as React from 'react';
import { Platform, Text, View } from 'react-native';
import { SignatureInk, type InkType } from 'react-native-signature-ink';

import {
  Action,
  Screen,
  Section,
  Toggle,
  useScreenStyles,
} from '../ui/ScreenShell';

const INKS: ReadonlyArray<InkType> = [
  'pen',
  'pencil',
  'marker',
  'monoline',
  'fountainPen',
  'watercolor',
  'crayon',
];

export default function ToolPickerScreen() {
  const styles = useScreenStyles();
  const [showPicker, setShowPicker] = React.useState(true);
  const [defaultInk, setDefaultInk] = React.useState<InkType>('pen');

  return (
    <Screen>
      <Text style={styles.title}>PencilKit tool picker</Text>
      <Text style={styles.description}>
        iOS only. When enabled the system `PKToolPicker` floats over the view;
        on iPad it's a draggable palette, on iPhone a docked bar. Picker colors
        are normalized to static light-mode equivalents so they don't
        auto-invert on a dark device theme.
        {Platform.OS !== 'ios' ? '\n\n(This prop is a no-op on Android.)' : ''}
      </Text>

      <View style={styles.canvasWrapper}>
        <SignatureInk
          style={styles.canvas}
          showToolPicker={showPicker}
          defaultInkType={defaultInk}
          showBaseline
        />
      </View>

      <Section label="Controls">
        <Toggle
          label="showToolPicker"
          value={showPicker}
          onChange={setShowPicker}
        />
      </Section>

      <Section label="defaultInkType (initial pick)">
        <View style={styles.row}>
          {INKS.map((ink) => (
            <Action
              key={ink}
              label={ink + (defaultInk === ink ? ' ✓' : '')}
              onPress={() => setDefaultInk(ink)}
            />
          ))}
        </View>
      </Section>
    </Screen>
  );
}
