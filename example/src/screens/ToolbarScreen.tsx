import * as React from 'react';
import { Text, View } from 'react-native';
import {
  SignatureInk,
  type SignatureInkHandle,
  type ToolbarButton,
} from 'react-native-signature-ink';

import {
  NumberKnob,
  Screen,
  Section,
  Toggle,
  useScreenStyles,
} from '../ui/ScreenShell';

const ALL_BUTTONS: ReadonlyArray<ToolbarButton> = [
  'undo',
  'redo',
  'clear',
  'copy',
];

export default function ToolbarScreen() {
  const styles = useScreenStyles();
  const ref = React.useRef<SignatureInkHandle>(null);

  const [showToolbar, setShowToolbar] = React.useState(true);
  const [position, setPosition] = React.useState<'top' | 'bottom'>('bottom');
  const [height, setHeight] = React.useState(48);
  const [spacing, setSpacing] = React.useState(8);
  const [buttons, setButtons] =
    React.useState<ReadonlyArray<ToolbarButton>>(ALL_BUTTONS);

  const toggleButton = (b: ToolbarButton) =>
    setButtons((prev) =>
      prev.includes(b)
        ? prev.filter((x) => x !== b)
        : [...ALL_BUTTONS.filter((x) => prev.includes(x) || x === b)]
    );

  return (
    <Screen>
      <Text style={styles.title}>Built-in toolbar</Text>
      <Text style={styles.description}>
        The native toolbar uses SF Symbols on iOS and vector drawables on
        Android. `toolbarHeight` drives the symmetric vertical gap around the
        icons; `toolbarIconSpacing` is the horizontal gap between buttons.
      </Text>

      <View style={styles.canvasWrapper}>
        <SignatureInk
          ref={ref}
          style={styles.canvas}
          showToolbar={showToolbar}
          toolbarPosition={position}
          toolbarButtons={buttons}
          toolbarHeight={height}
          toolbarIconSpacing={spacing}
          toolbarTintColor="#2563eb"
          showBaseline
        />
      </View>

      <Section label="Layout">
        <View style={styles.row}>
          <Toggle
            label="Show toolbar"
            value={showToolbar}
            onChange={setShowToolbar}
          />
          <Toggle
            label="Position = top"
            value={position === 'top'}
            onChange={(v) => setPosition(v ? 'top' : 'bottom')}
          />
        </View>
      </Section>

      <Section label="Gaps">
        <View style={styles.row}>
          <NumberKnob
            label="toolbarHeight"
            value={height}
            min={32}
            max={96}
            step={4}
            format={(v) => `${v}pt`}
            onChange={setHeight}
          />
          <NumberKnob
            label="toolbarIconSpacing"
            value={spacing}
            min={0}
            max={32}
            step={2}
            format={(v) => `${v}pt`}
            onChange={setSpacing}
          />
        </View>
      </Section>

      <Section label="Visible buttons">
        <View style={styles.row}>
          {ALL_BUTTONS.map((b) => (
            <Toggle
              key={b}
              label={b}
              value={buttons.includes(b)}
              onChange={() => toggleButton(b)}
            />
          ))}
        </View>
      </Section>
    </Screen>
  );
}
