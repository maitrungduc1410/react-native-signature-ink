import { Platform, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { Screen, useScreenStyles } from '../ui/ScreenShell';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface DemoEntry {
  route: keyof RootStackParamList;
  title: string;
  subtitle: string;
  /** When set, the entry is hidden on platforms not in the list. */
  platforms?: ReadonlyArray<typeof Platform.OS>;
}

const DEMOS: ReadonlyArray<DemoEntry> = [
  {
    route: 'Showcase',
    title: 'Showcase',
    subtitle: 'Built-in toolbar, baseline, every export, replay — all in one',
  },
  {
    route: 'Basics',
    title: 'Basics',
    subtitle: 'Draw, undo / redo / clear via the imperative API',
  },
  {
    route: 'Toolbar',
    title: 'Toolbar & gaps',
    subtitle: 'Position, buttons, tint, height, icon spacing',
  },
  {
    route: 'Baseline',
    title: 'Baseline',
    subtitle: 'Toggle, color, custom offset (toolbar hidden)',
  },
  {
    route: 'Theme',
    title: 'Dark / light theme',
    subtitle: 'Configure every color individually for any palette',
  },
  {
    route: 'ToolPicker',
    title: 'iOS tool picker',
    subtitle: 'PKToolPicker for ink / color / width / eraser',
    platforms: ['ios'],
  },
  {
    route: 'PencilOnly',
    title: 'Pencil only',
    subtitle: 'Drop finger touches; iPad Pencil / Android stylus only',
  },
  {
    route: 'Exports',
    title: 'Exports & photos',
    subtitle: 'base64, file, SVG, clipboard, save to Photos',
  },
  {
    route: 'StrokeData',
    title: 'Stroke data & replay',
    subtitle: 'Capture, restore, animate the signature again',
  },
  {
    route: 'Events',
    title: 'Drawing events',
    subtitle: 'onBegin / onEnd / onChange / onToolbarAction',
  },
  {
    route: 'Modal',
    title: 'Inside a Modal',
    subtitle: 'Capture a signature in a slide-up sheet, hand it back',
  },
  {
    route: 'ScrollList',
    title: 'ScrollView · 3 signers',
    subtitle: 'Customer / Witness / Notary on one scrolling form',
  },
  {
    route: 'FlatListDemo',
    title: 'FlatList · 12 rows',
    subtitle: 'Per-row canvases, with cached restore on row remount',
  },
  {
    route: 'Mount',
    title: 'Mount / remount',
    subtitle: 'Toggle the canvas; bump key to force a fresh native view',
  },
];

export default function HomeScreen({ navigation }: Props) {
  const styles = useScreenStyles();
  const entries = DEMOS.filter(
    (d) => d.platforms == null || d.platforms.includes(Platform.OS)
  );
  return (
    <Screen>
      <Text style={styles.description}>
        Each screen below exercises a distinct slice of the
        `react-native-signature-ink` API so you can verify how a prop actually
        behaves on the device.
      </Text>
      {entries.map((d) => (
        <TouchableOpacity
          key={d.route}
          style={styles.listItem}
          onPress={() => navigation.navigate(d.route as never)}
          activeOpacity={0.7}
        >
          <View style={styles.listText}>
            <Text style={styles.listTitle}>{d.title}</Text>
            <Text style={styles.listSubtitle}>{d.subtitle}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}
