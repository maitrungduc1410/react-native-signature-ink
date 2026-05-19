import { Platform, StyleSheet } from 'react-native';

export const lightTokens = {
  background: '#f6f7f8',
  card: '#ffffff',
  border: '#dde0e3',
  text: '#111111',
  muted: '#6b7280',
  accent: '#2563eb',
  danger: '#b53b3b',
  dangerBg: '#fff5f5',
  dangerBorder: '#f0a8a8',
};

export const darkTokens = {
  background: '#0b0c0e',
  card: '#161719',
  border: '#2a2d30',
  text: '#f1f2f3',
  muted: '#9aa0a6',
  accent: '#60a5fa',
  danger: '#ef9a9a',
  dangerBg: '#2a1414',
  dangerBorder: '#5a2828',
};

export type Tokens = typeof lightTokens;

export const makeStyles = (t: Tokens) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },
    container: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: t.text,
      marginBottom: 4,
    },
    description: {
      fontSize: 13,
      color: t.muted,
      lineHeight: 18,
      marginBottom: 12,
    },
    canvasWrapper: {
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      backgroundColor: t.card,
      overflow: 'hidden',
    },
    canvas: {
      height: 260,
      width: '100%',
    },
    section: {
      marginTop: 16,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: t.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
      marginBottom: 8,
    },
    toggleLabel: {
      marginLeft: 8,
      color: t.text,
      fontSize: 13,
    },
    actionBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      marginRight: 8,
      marginBottom: 8,
    },
    actionDanger: {
      borderColor: t.dangerBorder,
      backgroundColor: t.dangerBg,
    },
    actionText: {
      color: t.text,
      fontSize: 13,
      fontWeight: '500',
    },
    actionTextDanger: {
      color: t.danger,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.card,
      borderColor: t.border,
      borderWidth: StyleSheet.hairlineWidth,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 10,
    },
    listText: {
      flex: 1,
    },
    listTitle: {
      fontSize: 15,
      color: t.text,
      fontWeight: '600',
    },
    listSubtitle: {
      marginTop: 2,
      fontSize: 12,
      color: t.muted,
    },
    chevron: {
      color: t.muted,
      fontSize: 18,
      marginLeft: 12,
    },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: t.border,
      marginRight: 8,
      marginBottom: 8,
    },
    knob: {
      flexBasis: '48%',
      flexGrow: 1,
      marginRight: 8,
      marginBottom: 8,
    },
    knobLabel: {
      fontSize: 12,
      color: t.muted,
      marginBottom: 4,
    },
    knobRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    knobValue: {
      width: 36,
      textAlign: 'right',
      fontSize: 12,
      color: t.text,
      fontVariant: ['tabular-nums'],
      marginLeft: 6,
    },
    statusPill: {
      alignSelf: 'flex-start',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 999,
      borderColor: t.border,
      borderWidth: 1,
      marginBottom: 8,
    },
    statusPillText: {
      fontSize: 11,
      color: t.muted,
      fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    },
    previewWrap: {
      marginTop: 12,
    },
    preview: {
      width: '100%',
      height: 160,
      resizeMode: 'contain',
      backgroundColor: t.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.border,
    },
    logBox: {
      backgroundColor: t.card,
      borderColor: t.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      minHeight: 80,
      maxHeight: 220,
    },
    logLine: {
      fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
      fontSize: 11,
      color: t.text,
      marginBottom: 2,
    },
  });
