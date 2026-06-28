import * as React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  SignatureInk,
  type SignatureInkHandle,
} from 'react-native-signature-ink';

import {
  Action,
  Screen,
  StatusPill,
  useScreenStyles,
  useTokens,
} from '../ui/ScreenShell';

interface Signer {
  id: string;
  title: string;
  hint: string;
}

const SIGNERS: ReadonlyArray<Signer> = [
  {
    id: 'customer',
    title: 'Customer',
    hint: 'I have read and accept the terms.',
  },
  {
    id: 'witness',
    title: 'Witness',
    hint: 'I confirm I observed the signature above.',
  },
  {
    id: 'notary',
    title: 'Notary',
    hint: 'I certify the identity of the signatories.',
  },
];

export default function ScrollListScreen() {
  const styles = useScreenStyles();
  const tokens = useTokens();

  const refs = React.useRef<Record<string, SignatureInkHandle | null>>({});
  const [empty, setEmpty] = React.useState<Record<string, boolean>>({});

  const setRef = (id: string) => (instance: SignatureInkHandle | null) => {
    refs.current[id] = instance;
  };

  const allSigned = SIGNERS.every((s) => empty[s.id] === false);

  const submit = async () => {
    try {
      const results = await Promise.all(
        SIGNERS.map(async (s) => {
          const len =
            (await refs.current[s.id]?.toBase64({ trim: true }))?.length ?? 0;
          return `${s.title}: ${len} bytes`;
        })
      );
      Alert.alert('All three captured', results.join('\n'));
    } catch (e) {
      Alert.alert('Failed', String(e));
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Multiple instances in a ScrollView</Text>
      <Text style={styles.description}>
        Three independent native canvases mounted at once. Each one owns its own
        ref, undo stack, and event stream — they do not share state. Useful for
        contract-style flows that require several inline signatures on a single
        form.
      </Text>

      {SIGNERS.map((s) => (
        <View key={s.id} style={listStyles.card}>
          <View style={listStyles.cardHeader}>
            <Text style={[styles.title, listStyles.cardTitle]}>{s.title}</Text>
            <StatusPill text={empty[s.id] === false ? 'signed' : 'pending'} />
          </View>
          <Text style={styles.description}>{s.hint}</Text>

          <View style={styles.canvasWrapper}>
            <SignatureInk
              ref={setRef(s.id)}
              style={listStyles.canvas}
              showBaseline
              showToolbar
              toolbarTintColor={tokens.accent}
              toolbarButtons={[{ id: 'undo' }, { id: 'clear' }]}
              onChange={(e) =>
                setEmpty((prev) => ({ ...prev, [s.id]: e.isEmpty }))
              }
            />
          </View>
        </View>
      ))}

      <View style={[styles.row, listStyles.actions]}>
        <Action
          label={allSigned ? 'Submit all' : 'Submit (incomplete)'}
          onPress={submit}
          disabled={!allSigned}
        />
        <Action
          label="Reset all"
          variant="danger"
          onPress={() => {
            SIGNERS.forEach((s) => refs.current[s.id]?.clear());
          }}
        />
      </View>
    </Screen>
  );
}

const listStyles = StyleSheet.create({
  card: {
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    marginBottom: 0,
  },
  canvas: {
    height: 180,
    width: '100%',
  },
  actions: {
    marginTop: 16,
  },
});
