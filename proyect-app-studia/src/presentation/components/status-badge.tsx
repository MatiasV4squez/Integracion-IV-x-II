import { StyleSheet, View } from 'react-native';

import { Txt } from '@/presentation/components/txt';
import { STATUS_META } from '@/presentation/constants/session-status';
import type { Tone } from '@/presentation/constants/tones';
import { useTone } from '@/presentation/hooks/use-tone';
import type { SessionStatus } from '@/domain/sesiones/session';

export function StatusBadge({ status }: { status: SessionStatus }) {
  const meta = STATUS_META[status];
  return <ToneBadge tone={meta.tone} label={meta.label} />;
}

/** Insignia de estado con un tono cualquiera (sesiones, postulaciones…). */
export function ToneBadge({ tone: toneName, label }: { tone: Tone; label: string }) {
  const tone = useTone(toneName);

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]} accessibilityLabel={`Estado: ${label}`}>
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
      <Txt variant="caption" style={{ color: tone.fg, fontWeight: '700' }}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
