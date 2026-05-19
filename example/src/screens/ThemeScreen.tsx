import * as React from 'react';
import { Text, View, type ColorValue } from 'react-native';
import { SignatureInk } from 'react-native-signature-ink';

import { Action, Screen, Section, useScreenStyles } from '../ui/ScreenShell';

interface PadTheme {
  background: ColorValue;
  pen: ColorValue;
  baseline: ColorValue;
  toolbarBg: ColorValue;
  toolbarTint: ColorValue;
}

const LIGHT: PadTheme = {
  background: '#ffffff',
  pen: '#111111',
  baseline: '#b8bcc1',
  toolbarBg: 'transparent',
  toolbarTint: '#2563eb',
};

const DARK: PadTheme = {
  background: '#0c0c0e',
  pen: '#f5f5f5',
  baseline: '#3a3d42',
  toolbarBg: 'transparent',
  toolbarTint: '#60a5fa',
};

const SEPIA: PadTheme = {
  background: '#f1e9d2',
  pen: '#4a2a17',
  baseline: '#bca47a',
  toolbarBg: 'transparent',
  toolbarTint: '#7a3a1a',
};

const MIDNIGHT: PadTheme = {
  background: '#0b1f3a',
  pen: '#fde68a',
  baseline: '#1e3a8a',
  toolbarBg: 'transparent',
  toolbarTint: '#fbbf24',
};

const PRESETS: ReadonlyArray<{ name: string; theme: PadTheme }> = [
  { name: 'Light', theme: LIGHT },
  { name: 'Dark', theme: DARK },
  { name: 'Sepia', theme: SEPIA },
  { name: 'Midnight', theme: MIDNIGHT },
];

export default function ThemeScreen() {
  const styles = useScreenStyles();
  const [theme, setTheme] = React.useState<PadTheme>(LIGHT);

  return (
    <Screen>
      <Text style={styles.title}>Dark / light pad theming</Text>
      <Text style={styles.description}>
        Every color is configurable independently. Pass concrete colors (hex /
        named) rather than trait-adaptive ones — the library captures them
        literally so what you set is what gets rendered and exported.
      </Text>

      <View
        style={[
          styles.canvasWrapper,
          { backgroundColor: theme.background as string },
        ]}
      >
        <SignatureInk
          style={styles.canvas}
          backgroundColor={theme.background}
          penColor={theme.pen}
          baselineColor={theme.baseline}
          toolbarBackgroundColor={theme.toolbarBg}
          toolbarTintColor={theme.toolbarTint}
          showBaseline
          showToolbar
        />
      </View>

      <Section label="Presets">
        <View style={styles.row}>
          {PRESETS.map((p) => (
            <Action
              key={p.name}
              label={p.name}
              onPress={() => setTheme(p.theme)}
            />
          ))}
        </View>
      </Section>

      <Section label="Active values">
        <Text style={styles.description}>
          {`backgroundColor: ${String(theme.background)}\npenColor: ${String(
            theme.pen
          )}\nbaselineColor: ${String(theme.baseline)}\ntoolbarTintColor: ${String(
            theme.toolbarTint
          )}`}
        </Text>
      </Section>
    </Screen>
  );
}
