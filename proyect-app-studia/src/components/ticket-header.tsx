import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/txt';
import { STATUS_META } from '@/constants/session-status';
import { MaxContentWidth } from '@/constants/theme';
import { TONE_DOT } from '@/constants/tones';
import { useUI } from '@/hooks/use-ui';
import type { SessionStatus } from '@/types/session';

type Props = { title: string; subtitle: string; status: SessionStatus; onBack: () => void };

/** Cabecera azul marino del ticket: volver, título y estado de la sesión con punto de color. */
export function TicketHeader({ title, subtitle, status, onBack }: Props) {
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const meta = STATUS_META[status];
  const dot = TONE_DOT[meta.tone];

  return (
    <View style={[styles.wrap, { backgroundColor: ui.navy }]}>
      <View style={[styles.inner, { paddingTop: insets.top + 6 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} hitSlop={8} style={styles.back}>
          <Txt variant="h2" style={{ color: '#FFFFFF' }}>
            ‹
          </Txt>
        </Pressable>

        <View style={styles.flex}>
          <Txt variant="h3" style={{ color: '#FFFFFF', fontSize: 18 }}>
            {title}
          </Txt>
          <Txt variant="caption" style={{ color: ui.navyMuted }}>
            {subtitle}
          </Txt>
        </View>

        <View style={styles.pill} accessibilityLabel={`Estado: ${meta.label}`}>
          <View style={[styles.dot, { backgroundColor: dot }]} />
          <Txt variant="caption" style={{ color: dot, fontWeight: '800', letterSpacing: 0.6 }}>
            {meta.label.toUpperCase()}
          </Txt>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomLeftRadius: 26, borderBottomRightRadius: 26, paddingBottom: 18 },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flex: { flex: 1 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
