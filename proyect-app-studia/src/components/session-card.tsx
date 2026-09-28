import { Pressable, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Session } from '@/types/session';
import { formatDate, formatTimeRange } from '@/utils/format';

type Props = { session: Session; onPress?: () => void };

export function SessionCard({ session, onPress }: Props) {
  const theme = useTheme();
  const iAmTutee = session.myRole === 'tutee';
  const counterpart = iAmTutee ? session.tutor.name : session.tutee.name;

  let ratingText: string | null = null;
  if (session.status === 'completada') {
    ratingText = session.myRating ? `Tu calificación: ★ ${session.myRating}` : 'Sin calificar';
  }

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <ThemedText type="default" style={styles.subject} numberOfLines={1}>
            {session.subject.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {session.subject.code}
          </ThemedText>
        </View>
        <StatusBadge status={session.status} />
      </View>

      <View style={styles.details}>
        <ThemedText type="small">
          {iAmTutee ? 'Tutor' : 'Tutee'}: {counterpart}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(session.startsAt)} · {formatTimeRange(session.startsAt, session.endsAt)}
        </ThemedText>
        {ratingText ? (
          <ThemedText type="small" themeColor="textSecondary">
            {ratingText}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flex: { flex: 1 },
  subject: { fontWeight: '700' },
  details: { gap: 2 },
});
