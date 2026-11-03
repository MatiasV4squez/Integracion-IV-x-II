import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/presentation/components/avatar';
import { Card } from '@/presentation/components/card';
import { RatingStars } from '@/presentation/components/rating-stars';
import { StatusBadge } from '@/presentation/components/status-badge';
import { Txt } from '@/presentation/components/txt';
import { useUI } from '@/presentation/hooks/use-ui';
import type { Session } from '@/domain/sesiones/session';
import { formatDate, formatTimeRange, plural } from '@/shared/format';

type Props = { session: Session; onPress?: () => void; actions?: ReactNode };

export function SessionCard({ session, onPress, actions }: Props) {
  const ui = useUI();
  const iAmTutee = session.myRole === 'tutee';
  const counterpart = iAmTutee ? session.tutor.name : session.tutee.name;

  const label = `Sesión de ${session.subject.name}, ${session.status}`;
  const body = (
    <>
      <View style={styles.header}>
        <Avatar name={counterpart} size={42} />
        <View style={styles.headerText}>
          <Txt variant="h3" numberOfLines={1}>
            {session.subject.name}
          </Txt>
          <Txt variant="small" color="muted" numberOfLines={1}>
            {iAmTutee ? 'Tutor' : 'Tutee'}: {counterpart}
          </Txt>
        </View>
        <StatusBadge status={session.status} />
      </View>

      <View style={[styles.infoBox, { backgroundColor: ui.surfaceAlt }]}>
        <Txt variant="small">📅 {formatDate(session.startsAt)}</Txt>
        <Txt variant="small">🕒 {formatTimeRange(session.startsAt, session.endsAt)}</Txt>
      </View>

      {session.topic ? (
        <Txt variant="small" color="muted">
          📖 Unidad: <Txt variant="small">{session.topic}</Txt>
        </Txt>
      ) : null}

      <View style={styles.footer}>
        {session.status === 'completada' ? (
          session.myRating ? (
            <View style={styles.rating}>
              <RatingStars value={session.myRating} size={14} />
              <Txt variant="caption" color="muted">
                Tu calificación
              </Txt>
            </View>
          ) : (
            <Txt variant="caption" color="primary">
              ★ Sin calificar
            </Txt>
          )
        ) : (
          <View />
        )}
        {session.materials.length > 0 ? (
          <Txt variant="caption" color="muted">
            📎 {plural(session.materials.length, 'material', 'materiales')}
          </Txt>
        ) : null}
      </View>
    </>
  );

  if (!actions) {
    return (
      <Card onPress={onPress} accessibilityLabel={label}>
        {body}
      </Card>
    );
  }

  // Con acciones, solo el contenido es presionable: en web un botón no puede ir dentro de otro (<button>).
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.body, { opacity: pressed ? 0.92 : 1 }]}>
        {body}
      </Pressable>
      <View style={styles.actions}>{actions}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  infoBox: { flexDirection: 'row', gap: 16, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
