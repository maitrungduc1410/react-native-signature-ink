import * as React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ColorValue,
} from 'react-native';
import { SignatureInk, type BaselineStyle } from 'react-native-signature-ink';

import {
  ColorSwatchRow,
  NumberKnob,
  Screen,
  Section,
  Toggle,
  useScreenStyles,
  useTokens,
} from '../ui/ScreenShell';

const BASELINE_COLORS: ReadonlyArray<ColorValue> = [
  '#a0a3a8',
  '#1f2937',
  '#dc2626',
  '#0ea5e9',
];

const BASELINE_STYLES: ReadonlyArray<BaselineStyle> = [
  'solid',
  'dashed',
  'dotted',
];

export default function BaselineScreen() {
  const styles = useScreenStyles();
  const tokens = useTokens();

  const [showBaseline, setShowBaseline] = React.useState(true);
  const [color, setColor] = React.useState<ColorValue>('#a0a3a8');
  const [offset, setOffset] = React.useState(24);
  const [withToolbar, setWithToolbar] = React.useState(false);
  const [lineStyle, setLineStyle] = React.useState<BaselineStyle>('dashed');
  // `0` is the "auto / per-style default" sentinel; anything positive
  // overrides the native default thickness for the selected style.
  const [width, setWidth] = React.useState(0);

  return (
    <Screen>
      <Text style={styles.title}>Signing baseline</Text>
      <Text style={styles.description}>
        With the built-in toolbar hidden, the baseline sits exactly
        `baselineOffsetFromBottom` points above the canvas bottom. When the
        toolbar is shown, the baseline auto-anchors to the toolbar's top edge so
        the gap above the icons stays symmetric with the gap below — and the
        offset prop is intentionally ignored to keep the icons from shifting.
      </Text>

      <View style={styles.canvasWrapper}>
        <SignatureInk
          style={styles.canvas}
          showBaseline={showBaseline}
          baselineColor={color}
          baselineOffsetFromBottom={offset}
          baselineStyle={lineStyle}
          baselineWidth={width}
          showToolbar={withToolbar}
          toolbarTintColor="#2563eb"
        />
      </View>

      <Section label="Visibility">
        <View style={styles.row}>
          <Toggle
            label="Show baseline"
            value={showBaseline}
            onChange={setShowBaseline}
          />
          <Toggle
            label="Add toolbar (offset ignored)"
            value={withToolbar}
            onChange={setWithToolbar}
          />
        </View>
      </Section>

      <Section label="baselineStyle">
        <View style={styles.row}>
          {BASELINE_STYLES.map((s) => {
            const selected = s === lineStyle;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setLineStyle(s)}
                style={[
                  styles.actionBtn,
                  selected && {
                    borderColor: tokens.accent,
                    backgroundColor: tokens.card,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    selected && baselineLocal.styleLabelSelected,
                    selected && { color: tokens.accent },
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      <Section label="baselineWidth">
        <NumberKnob
          label="width"
          value={width}
          min={0}
          max={8}
          step={0.5}
          format={(v) => (v === 0 ? 'auto' : `${v}pt`)}
          onChange={setWidth}
        />
      </Section>

      <Section label="baselineOffsetFromBottom">
        <NumberKnob
          label="offset"
          value={offset}
          min={0}
          max={120}
          step={4}
          format={(v) => `${v}pt`}
          onChange={setOffset}
        />
      </Section>

      <Section label="baselineColor">
        <ColorSwatchRow
          colors={BASELINE_COLORS}
          value={color}
          onChange={setColor}
        />
      </Section>
    </Screen>
  );
}

const baselineLocal = StyleSheet.create({
  styleLabelSelected: { fontWeight: '600' },
});
