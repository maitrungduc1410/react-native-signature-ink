import * as React from 'react';
import { Alert, Text, View } from 'react-native';
import {
  SignatureInk,
  ToolbarAction,
  ToolbarIcon,
  type SignatureInkHandle,
  type ToolbarItem,
} from 'react-native-signature-ink';

import {
  NumberKnob,
  Screen,
  Section,
  Toggle,
  useScreenStyles,
} from '../ui/ScreenShell';

export default function ToolbarScreen() {
  const styles = useScreenStyles();
  const ref = React.useRef<SignatureInkHandle>(null);

  const [showToolbar, setShowToolbar] = React.useState(true);
  const [position, setPosition] = React.useState<'top' | 'bottom'>('bottom');
  const [height, setHeight] = React.useState(48);
  const [spacing, setSpacing] = React.useState(8);
  const [showText, setShowText] = React.useState(false);
  const [withCustom, setWithCustom] = React.useState(true);
  const [maxVisible, setMaxVisible] = React.useState(0);
  const [lastAction, setLastAction] = React.useState('—');

  // Built-in items keep their native behavior; the `save` item is a
  // custom, headless button that only fires `onToolbarAction`.
  const buttons = React.useMemo<ReadonlyArray<ToolbarItem>>(() => {
    const items: ToolbarItem[] = [
      showText
        ? { id: ToolbarAction.Undo, icon: ToolbarIcon.Undo, text: 'Undo' }
        : { id: ToolbarAction.Undo },
      showText
        ? { id: ToolbarAction.Redo, icon: ToolbarIcon.Redo, text: 'Redo' }
        : { id: ToolbarAction.Redo },
      showText
        ? { id: ToolbarAction.Clear, icon: ToolbarIcon.Clear, text: 'Clear' }
        : { id: ToolbarAction.Clear },
      showText
        ? { id: ToolbarAction.Copy, icon: ToolbarIcon.Copy, text: 'Copy' }
        : { id: ToolbarAction.Copy },
    ];
    if (withCustom) {
      items.push(
        showText
          ? { id: 'save', icon: ToolbarIcon.Save, text: 'Save' }
          : { id: 'save', icon: ToolbarIcon.Save }
      );
    }
    return items;
  }, [showText, withCustom]);

  const handleSave = React.useCallback(async () => {
    try {
      const uri = await ref.current?.toFile({ format: 'png', trim: true });
      Alert.alert('Saved', uri ? `Wrote PNG to:\n${uri}` : 'Nothing to save');
    } catch (e) {
      Alert.alert('Save failed', String(e));
    }
  }, []);

  return (
    <Screen>
      <Text style={styles.title}>Toolbar items</Text>
      <Text style={styles.description}>
        `toolbarButtons` takes an array of item objects. Built-in ids (undo /
        redo / clear / copy) carry native behavior; any other id (here `save`)
        is a custom button that only fires `onToolbarAction`. Items can show an
        icon, text, or both. When they don't fit, extras collapse into an
        overflow menu.
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
          toolbarMaxVisibleButtons={maxVisible}
          toolbarTintColor="#2563eb"
          showBaseline
          onToolbarAction={(e) => {
            setLastAction(e.id);
            if (e.id === 'save') handleSave();
          }}
        />
      </View>

      <Text style={styles.description}>Last action: {lastAction}</Text>

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

      <Section label="Items">
        <View style={styles.row}>
          <Toggle label="Text labels" value={showText} onChange={setShowText} />
          <Toggle
            label="Custom 'Save'"
            value={withCustom}
            onChange={setWithCustom}
          />
        </View>
      </Section>

      <Section label="Gaps & overflow">
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
        <View style={styles.row}>
          <NumberKnob
            label="maxVisible (0 = auto)"
            value={maxVisible}
            min={0}
            max={6}
            step={1}
            format={(v) => (v === 0 ? 'auto' : `${v}`)}
            onChange={setMaxVisible}
          />
        </View>
      </Section>
    </Screen>
  );
}
