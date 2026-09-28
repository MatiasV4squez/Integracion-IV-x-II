import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { STATUS_META } from '@/constants/session-status';
import { useTone } from '@/hooks/use-tone';
import type { SessionStatus } from '@/types/session';

export function StatusBadge({ status }: { status: SessionStatus }) {
  const meta = STATUS_META[status];
  const tone = useTone(meta.tone);

  return (
    <View
      style={[styles.badge, { backgroundColor: tone.bg }]}
      accessibilityLabel={`Estado: ${meta.label}`}>
      <ThemedText type="smallBold" style={{ color: tone.fg }}>
        {meta.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
