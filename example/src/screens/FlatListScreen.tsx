import * as React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SignatureInk,
  type SignatureInkHandle,
  type StrokeData,
} from 'react-native-signature-ink';

import {
  Action,
  StatusPill,
  useScreenStyles,
  useTokens,
} from '../ui/ScreenShell';

interface Row {
  id: string;
  label: string;
}

const ROWS: ReadonlyArray<Row> = Array.from({ length: 12 }, (_, i) => ({
  id: `approval-${i + 1}`,
  label: `Approval #${(i + 1).toString().padStart(2, '0')}`,
}));

const ROW_HEIGHT = 230;

export default function FlatListScreen() {
  const styles = useScreenStyles();
  const tokens = useTokens();
  const insets = useSafeAreaInsets();

  // Stroke data is hoisted up to the parent so it survives FlatList's
  // windowing: when a row scrolls far enough off-screen FlatList unmounts
  // its native canvas, and remounting from the cached stroke data is
  // what keeps the signature visible when you scroll back.
  const [cache, setCache] = React.useState<Record<string, StrokeData>>({});
  const [signed, setSigned] = React.useState<Record<string, boolean>>({});

  const renderItem = React.useCallback(
    ({ item }: { item: Row }) => (
      <SignatureRow
        item={item}
        initial={cache[item.id]}
        onCommit={(data) => setCache((prev) => ({ ...prev, [item.id]: data }))}
        onSignedChange={(b) => setSigned((prev) => ({ ...prev, [item.id]: b }))}
      />
    ),
    [cache]
  );

  const Header = (
    <View style={listStyles.header}>
      <Text style={styles.title}>Many instances in a FlatList</Text>
      <Text style={styles.description}>
        Each row mounts an independent `SignatureInk`. FlatList unmounts rows
        that scroll outside its window, so the captured stroke data is cached in
        the parent and replayed via `setStrokeData` whenever a row re-mounts.
        Scroll, draw, scroll, scroll back — the drawing is still there.
      </Text>
      <View style={[styles.row, listStyles.summary]}>
        <StatusPill
          text={`${Object.values(signed).filter(Boolean).length} / ${ROWS.length} signed`}
        />
        <Action
          label="Clear cache"
          variant="danger"
          onPress={() => {
            setCache({});
            setSigned({});
          }}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, listStyles.screenPad]}>
      <FlatList
        data={ROWS}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ListHeaderComponent={Header}
        contentContainerStyle={[
          listStyles.content,
          { paddingBottom: 24 + insets.bottom },
        ]}
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        // Recycling-friendly windowing for hosting native components:
        // - removeClippedSubviews is unstable on Android with our native
        //   PencilKit / Choreographer views, so disable it.
        // - Small windowSize forces frequent unmount/remount so the
        //   restore-from-cache path is exercised by normal scrolling.
        removeClippedSubviews={false}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={3}
        // Suppress the warning bubbling up from windowing-related drops.
        viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
        // The themed tint comes from the parent so rows can be plain
        // memoised components without their own theme hook.
        extraData={tokens.accent}
      />
    </View>
  );
}

interface SignatureRowProps {
  item: Row;
  initial?: StrokeData;
  onCommit: (data: StrokeData) => void;
  onSignedChange: (signed: boolean) => void;
}

function SignatureRow({
  item,
  initial,
  onCommit,
  onSignedChange,
}: SignatureRowProps) {
  const styles = useScreenStyles();
  const tokens = useTokens();
  const ref = React.useRef<SignatureInkHandle>(null);
  const [empty, setEmpty] = React.useState(
    initial == null || initial.length === 0
  );

  // Restore any previously captured strokes the first time this row
  // mounts (or remounts after being recycled by FlatList).
  React.useEffect(() => {
    if (initial && initial.length > 0) {
      ref.current?.setStrokeData(initial);
    }
    // We deliberately only restore on first mount; subsequent edits
    // flow up via onEnd → onCommit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={listStyles.row}>
      <View style={listStyles.rowHeader}>
        <Text style={[styles.title, listStyles.rowTitle]}>{item.label}</Text>
        <StatusPill text={empty ? 'pending' : 'signed'} />
      </View>
      <View style={styles.canvasWrapper}>
        <SignatureInk
          ref={ref}
          style={listStyles.canvas}
          showBaseline
          showToolbar
          toolbarTintColor={tokens.accent}
          toolbarButtons={[{ id: 'undo' }, { id: 'clear' }]}
          onChange={(e) => {
            setEmpty(e.isEmpty);
            onSignedChange(!e.isEmpty);
          }}
          onEnd={async () => {
            try {
              const data = (await ref.current?.getStrokeData()) ?? [];
              onCommit(data);
            } catch {
              // Row may have already unmounted; swallow so we don't
              // surface a useless error to the user.
            }
          }}
        />
      </View>
    </View>
  );
}

const listStyles = StyleSheet.create({
  screenPad: { paddingTop: 8 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  header: { marginBottom: 8 },
  summary: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    height: ROW_HEIGHT,
    paddingBottom: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowTitle: { fontSize: 14, marginBottom: 0 },
  canvas: { height: 170, width: '100%' },
});
