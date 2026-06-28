import * as React from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SignatureInk,
  type SignatureInkHandle,
} from 'react-native-signature-ink';

import {
  Action,
  Screen,
  Section,
  useScreenStyles,
  useTokens,
} from '../ui/ScreenShell';

export default function ModalScreen() {
  const styles = useScreenStyles();
  const tokens = useTokens();
  const insets = useSafeAreaInsets();

  const ref = React.useRef<SignatureInkHandle>(null);
  const [visible, setVisible] = React.useState(false);
  const [savedPng, setSavedPng] = React.useState<string | null>(null);
  const [empty, setEmpty] = React.useState(true);

  const open = () => {
    setVisible(true);
    // Clear any previous signature so the modal opens fresh.
    requestAnimationFrame(() => ref.current?.clear());
  };

  const cancel = () => setVisible(false);

  const confirm = async () => {
    try {
      const b64 = await ref.current?.toBase64({ format: 'png', trim: true });
      if (b64) setSavedPng(`data:image/png;base64,${b64}`);
    } finally {
      setVisible(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Capture inside a Modal</Text>
      <Text style={styles.description}>
        Mounts the canvas only while the RN `Modal` is visible. The signature is
        rendered to base64 and handed back to the parent screen on confirm;
        cancelling drops the strokes entirely.
      </Text>

      <Section label="Trigger">
        <View style={styles.row}>
          <Action label="Sign…" onPress={open} />
          {savedPng != null && (
            <Action
              label="Clear last"
              variant="danger"
              onPress={() => setSavedPng(null)}
            />
          )}
        </View>
      </Section>

      {savedPng != null && (
        <Section label="Last captured (from modal)">
          <Image source={{ uri: savedPng }} style={styles.preview} />
        </Section>
      )}

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle={
          Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'
        }
        transparent={Platform.OS !== 'ios'}
        onRequestClose={cancel}
      >
        <View
          style={[
            modalStyles.backdrop,
            { backgroundColor: tokens.background },
            Platform.OS !== 'ios' && modalStyles.scrim,
          ]}
        >
          <View
            style={[
              modalStyles.sheet,
              {
                backgroundColor: tokens.background,
                paddingTop: insets.top + 16,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={modalStyles.header}>
              <Text style={[styles.title, modalStyles.headerTitle]}>
                Sign here
              </Text>
              <Pressable onPress={cancel} hitSlop={12}>
                <Text style={[styles.actionText, { color: tokens.muted }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>

            <View style={styles.canvasWrapper}>
              <SignatureInk
                ref={ref}
                style={modalStyles.canvas}
                penColor={tokens.text}
                backgroundColor={tokens.card}
                showBaseline
                showToolbar
                toolbarTintColor={tokens.accent}
                toolbarButtons={[
                  { id: 'undo' },
                  { id: 'redo' },
                  { id: 'clear' },
                ]}
                onChange={(e) => setEmpty(e.isEmpty)}
              />
            </View>

            <View style={[styles.row, modalStyles.actionsRow]}>
              <Action
                label="Clear"
                variant="danger"
                onPress={() => ref.current?.clear()}
              />
              <Action
                label={empty ? 'Done (empty)' : 'Done'}
                onPress={confirm}
                disabled={empty}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1 },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: { marginBottom: 0 },
  canvas: { height: 320, width: '100%' },
  actionsRow: { marginTop: 16, justifyContent: 'flex-end' },
});
