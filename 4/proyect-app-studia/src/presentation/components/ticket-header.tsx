import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/presentation/components/txt';
import { STATUS_META } from '@/presentation/constants/session-status';
import { MaxContentWidth } from '@/presentation/constants/theme';
import { useTone } from '@/presentation/hooks/use-tone';
import { useUI } from '@/presentation/hooks/use-ui';
import type { SessionStatus } from '@/domain/sesiones/session';

type Props = { title: string; subtitle: string; status: SessionStatus; onBack: () => void };

/** Cabecera del ticket con el degradado azul de la web: volver, título y estado de la sesión con punto de color. */
export function TicketHeader({ title, subtitle, status, onBack }: Props) {
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const meta = STATUS_META[status];
  // La píldora es blanca: se usa el color de texto del tono (legible sobre blanco).
  const dot = useTone(meta.tone).fg;

  return (
    <LinearGradient colors={[ui.cyan, ui.navy]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.4 }} style={styles.wrap}>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomLeftRadius: 18, borderBottomRightRadius: 18, paddingBottom: 18 },
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
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
