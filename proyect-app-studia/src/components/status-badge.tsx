import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { STATUS_META } from '@/constants/session-status';
import { useTone } from '@/hooks/use-tone';
import type { SessionStatus } from '@/types/session';

export function StatusBadge({ status }: { status: SessionStatus }) {
  const meta = STATUS_META[status];
  const tone = useTone(meta.tone);

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]} accessibilityLabel={`Estado: ${meta.label}`}>
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
      <Txt variant="caption" style={{ color: tone.fg, fontWeight: '700' }}>
        {meta.label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
