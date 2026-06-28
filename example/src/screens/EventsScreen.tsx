import * as React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SignatureInk } from 'react-native-signature-ink';

import { Action, Screen, Section, useScreenStyles } from '../ui/ScreenShell';

const MAX_LINES = 80;

export default function EventsScreen() {
  const styles = useScreenStyles();
  const [log, setLog] = React.useState<string[]>([]);

  const push = React.useCallback((line: string) => {
    const stamp = new Date().toLocaleTimeString();
    setLog((prev) => {
      const next = [`${stamp}  ${line}`, ...prev];
      return next.length > MAX_LINES ? next.slice(0, MAX_LINES) : next;
    });
  }, []);

  return (
    <Screen>
      <Text style={styles.title}>Drawing events</Text>
      <Text style={styles.description}>
        Every interaction with the canvas — finger / pencil down and up, added /
        removed strokes, and built-in toolbar taps — emits a typed event. Useful
        for analytics, autosave triggers, or enabling a parent "Submit" button.
      </Text>

      <View style={styles.canvasWrapper}>
        <SignatureInk
          style={styles.canvas}
          showBaseline
          showToolbar
          toolbarTintColor="#2563eb"
          onBegin={() => push('onBegin')}
          onEnd={() => push('onEnd')}
          onChange={(e) =>
            push(`onChange  isEmpty=${e.isEmpty}  count=${e.strokeCount}`)
          }
          onToolbarAction={(e) => push(`onToolbarAction  ${e.id}`)}
        />
      </View>

      <Section label="Event log (newest first)">
        <ScrollView style={styles.logBox} nestedScrollEnabled>
          {log.length === 0 ? (
            <Text style={styles.logLine}>(no events yet — draw above)</Text>
          ) : (
            log.map((line, i) => (
              <Text key={`${i}-${line}`} style={styles.logLine}>
                {line}
              </Text>
            ))
          )}
        </ScrollView>
        <View style={[styles.row, localStyles.logActions]}>
          <Action label="Clear log" onPress={() => setLog([])} />
        </View>
      </Section>
    </Screen>
  );
}

const localStyles = StyleSheet.create({
  logActions: { marginTop: 8 },
});
