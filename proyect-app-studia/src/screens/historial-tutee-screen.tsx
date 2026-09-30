import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { RatingStars } from '@/components/rating-stars';
import { StatTile } from '@/components/stat-tile';
import { Txt } from '@/components/txt';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useUI } from '@/hooks/use-ui';
import { useSessions } from '@/state/sessions-context';
import type { Session } from '@/types/session';
import { formatDate } from '@/utils/format';

/** Historial del Tutee: solo tutorías completadas, con la calificación que le dio a cada tutor. */
export default function HistorialTuteeScreen() {
  const router = useRouter();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const { sessions, setLastViewed } = useSessions();

  const completed = useMemo(
    () =>
      sessions
        .filter((s) => s.myRole === 'tutee' && s.status === 'completada')
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()),
    [sessions],
  );

  const average = useMemo(() => {
    const ratings = completed.flatMap((s) => (s.myRating ? [s.myRating] : []));
    return ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';
  }, [completed]);

  const openDetail = (id: string) => {
    setLastViewed(id);
    router.push({ pathname: '/detalle-sesion', params: { id } });
  };

  const header = (
    <View style={styles.header}>
      <View>
        <Txt variant="h1">Tutorías completadas</Txt>
        <Txt variant="small" color="muted">
          Revisa las tutorías que ya realizaste y la calificación que le diste a cada tutor.
        </Txt>
      </View>
      <View style={styles.tiles}>
        <StatTile value={String(completed.length)} label="Completadas" />
        <StatTile value={average === '—' ? '—' : `★ ${average}`} label="Tu calificación promedio" />
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: ui.bg, paddingTop: insets.top }]}>
      {/* FlatList = lista virtualizada (NFR18) */}
      <FlatList
        data={completed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <CompletedCard session={item} onPress={() => openDetail(item.id)} />}
        ListEmptyComponent={
          <EmptyState
            icon="🎓"
            title="Aún no tienes tutorías completadas"
            message="Cuando termines y califiques una tutoría, aparecerá aquí."
          />
        }
      />
    </View>
  );
}

function CompletedCard({ session, onPress }: { session: Session; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <Avatar name={session.tutor.name} size={44} />
        <View style={styles.flex}>
          <Txt variant="h3">{session.subject.name}</Txt>
          <Txt variant="small" color="muted">
            Con {session.tutor.name} · {formatDate(session.startsAt)}
          </Txt>
        </View>
      </View>
      <View style={styles.ratingRow}>
        <Txt variant="small" color="muted">
          Tu calificación al tutor:
        </Txt>
        {session.myRating ? (
          <RatingStars value={session.myRating} size={16} />
        ) : (
          <Txt variant="small" color="primary">
            Aún no calificaste
          </Txt>
        )}
      </View>
      {session.myComment ? (
        <Txt variant="small" color="muted">
          “{session.myComment}”
        </Txt>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.lg, paddingBottom: 64 },
  header: { gap: Spacing.lg, marginBottom: Spacing.lg },
  tiles: { flexDirection: 'row', gap: 10 },
  separator: { height: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
});
