import * as React from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { darkTokens, lightTokens, makeStyles, type Tokens } from './tokens';

export const useTokens = (): Tokens => {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTokens : lightTokens;
};

export const useScreenStyles = () => {
  const t = useTokens();
  return React.useMemo(() => makeStyles(t), [t]);
};

export function Screen({
  children,
  contentStyle,
}: {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const styles = useScreenStyles();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: 40 + insets.bottom },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Section({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const styles = useScreenStyles();
  return (
    <View style={styles.section}>
      {label != null && <Text style={styles.sectionLabel}>{label}</Text>}
      {children}
    </View>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const styles = useScreenStyles();
  return (
    <View style={styles.toggle}>
      <Switch value={value} onValueChange={onChange} />
      <Text style={styles.toggleLabel}>{label}</Text>
    </View>
  );
}

export function Action({
  label,
  onPress,
  variant,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'danger';
  disabled?: boolean;
}) {
  const styles = useScreenStyles();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionBtn,
        variant === 'danger' && styles.actionDanger,
        disabled && shellStyles.disabled,
      ]}
    >
      <Text
        style={[
          styles.actionText,
          variant === 'danger' && styles.actionTextDanger,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * A tiny `+`/`-` stepper. RN's core has no `<Slider>` and we don't want
 * to drag in another native dep just for the demo.
 */
export function NumberKnob({
  label,
  value,
  min = 0,
  max = 200,
  step = 2,
  format = (v) => `${v}`,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const styles = useScreenStyles();
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <View style={styles.knob}>
      <Text style={styles.knobLabel}>{label}</Text>
      <View style={styles.knobRow}>
        <SmallBtn onPress={() => onChange(clamp(value - step))} label="−" />
        <SmallBtn onPress={() => onChange(clamp(value + step))} label="+" />
        <Text style={styles.knobValue}>{format(value)}</Text>
      </View>
    </View>
  );
}

function SmallBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTokens();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        smallBtnStyles.btn,
        { borderColor: t.border, backgroundColor: t.card },
      ]}
    >
      <Text style={[smallBtnStyles.txt, { color: t.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const smallBtnStyles = StyleSheet.create({
  btn: {
    width: 32,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txt: { fontSize: 16, lineHeight: 16, fontWeight: '600' },
});

const shellStyles = StyleSheet.create({
  disabled: { opacity: 0.4 },
  swatchSelectedThick: { borderWidth: 2 },
  swatchSelectedDarkRing: { borderColor: '#000' },
  swatchSelectedLightRing: { borderColor: '#444' },
});

export function ColorSwatchRow({
  colors,
  value,
  onChange,
}: {
  colors: ReadonlyArray<ColorValue>;
  value: ColorValue;
  onChange: (c: ColorValue) => void;
}) {
  const styles = useScreenStyles();
  return (
    <View style={styles.row}>
      {colors.map((c, i) => {
        const selected = c === value;
        return (
          <TouchableOpacity
            key={`${i}-${String(c)}`}
            onPress={() => onChange(c)}
            style={[
              styles.swatch,
              selected && shellStyles.swatchSelectedThick,
              selected &&
                (typeof c === 'string' && c.toLowerCase() === '#ffffff'
                  ? shellStyles.swatchSelectedLightRing
                  : shellStyles.swatchSelectedDarkRing),
              { backgroundColor: c as string },
            ]}
          />
        );
      })}
    </View>
  );
}

export function StatusPill({ text }: { text: string }) {
  const styles = useScreenStyles();
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusPillText}>{text}</Text>
    </View>
  );
}
