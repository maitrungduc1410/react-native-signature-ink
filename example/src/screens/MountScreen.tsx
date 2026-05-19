import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  SignatureInk,
  type SignatureInkHandle,
} from 'react-native-signature-ink';

import {
  Action,
  Screen,
  Section,
  StatusPill,
  Toggle,
  useScreenStyles,
  useTokens,
} from '../ui/ScreenShell';

interface LifecycleEvent {
  id: number;
  at: string;
  text: string;
}

const MAX_EVENTS = 60;

export default function MountScreen() {
  const styles = useScreenStyles();
  const tokens = useTokens();
  const ref = React.useRef<SignatureInkHandle>(null);

  const [mounted, setMounted] = React.useState(true);
  const [remountKey, setRemountKey] = React.useState(0);
  // Starts at 1 to account for the initial render of the canvas; each
  // subsequent toggle from off → on bumps it.
  const [mountCount, setMountCount] = React.useState(1);
  const [events, setEvents] = React.useState<LifecycleEvent[]>([]);

  const pushEvent = React.useCallback((text: string) => {
    const at = new Date().toLocaleTimeString();
    setEvents((prev) =>
      [{ id: prev.length + 1, at, text }, ...prev].slice(0, MAX_EVENTS)
    );
  }, []);

  const remount = () => {
    setRemountKey((k) => k + 1);
    pushEvent('remount (key bumped)');
  };

  const exportBeforeUnmount = async () => {
    try {
      const empty = await ref.current?.isEmpty();
      pushEvent(`pre-unmount isEmpty → ${String(empty)}`);
    } catch (e) {
      pushEvent(`pre-unmount failed → ${String(e)}`);
    }
  };

  const tryAfterUnmount = async () => {
    try {
      const empty = await ref.current?.isEmpty();
      pushEvent(`post-unmount isEmpty → ${String(empty)}`);
    } catch (e) {
      pushEvent(`post-unmount rejected → ${(e as Error).message}`);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Mount, unmount, remount</Text>
      <Text style={styles.description}>
        Toggle the canvas in and out of the tree to verify lifecycle. Pending
        promise-based commands are rejected with "SignatureInk unmounted" on
        teardown so callers can clean up safely. Bumping the `key` forces a
        fresh native view with a clean undo stack without leaving the screen.
      </Text>

      <View style={[styles.row, mountStyles.summary]}>
        <StatusPill text={mounted ? 'mounted' : 'unmounted'} />
        <StatusPill text={`mount #${mountCount}`} />
        <StatusPill text={`key=${remountKey}`} />
      </View>

      <View style={[styles.canvasWrapper, mountStyles.canvasSlot]}>
        {mounted ? (
          <SignatureInk
            key={remountKey}
            ref={ref}
            style={mountStyles.canvas}
            penColor={tokens.text}
            backgroundColor={tokens.card}
            baselineColor={tokens.border}
            showBaseline
            showToolbar
            toolbarTintColor={tokens.accent}
            onBegin={() => pushEvent('onBegin')}
            onEnd={() => pushEvent('onEnd')}
            onChange={(e) =>
              pushEvent(`onChange isEmpty=${e.isEmpty} count=${e.strokeCount}`)
            }
          />
        ) : (
          <View style={[mountStyles.canvas, mountStyles.unmountedSlot]}>
            <Text style={[styles.description, mountStyles.placeholderText]}>
              (canvas is unmounted — native view destroyed)
            </Text>
          </View>
        )}
      </View>

      <Section label="Lifecycle controls">
        <View style={styles.row}>
          <Toggle
            label="Mounted"
            value={mounted}
            onChange={(v) => {
              setMounted(v);
              if (v) {
                setMountCount((c) => c + 1);
                pushEvent('mount');
              } else {
                pushEvent('unmount');
              }
            }}
          />
        </View>
        <View style={styles.row}>
          <Action label="Remount (bump key)" onPress={remount} />
          <Action
            label="isEmpty (mounted)"
            onPress={exportBeforeUnmount}
            disabled={!mounted}
          />
          <Action
            label="isEmpty (unmounted)"
            onPress={tryAfterUnmount}
            disabled={mounted}
          />
        </View>
      </Section>

      <Section label="Lifecycle log (newest first)">
        <View style={styles.logBox}>
          {events.length === 0 ? (
            <Text style={styles.logLine}>(no events yet)</Text>
          ) : (
            events.map((ev) => (
              <Text key={ev.id} style={styles.logLine}>
                {ev.at} {ev.text}
              </Text>
            ))
          )}
        </View>
        <View style={[styles.row, mountStyles.logActions]}>
          <Action label="Clear log" onPress={() => setEvents([])} />
        </View>
      </Section>
    </Screen>
  );
}

const mountStyles = StyleSheet.create({
  summary: { gap: 6, marginBottom: 8 },
  canvasSlot: { minHeight: 260 },
  canvas: { height: 260, width: '100%' },
  unmountedSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    margin: 0,
  },
  logActions: { marginTop: 8 },
});
