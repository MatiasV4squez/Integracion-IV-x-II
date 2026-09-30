import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { RatingStars } from '@/components/rating-stars';
import { Txt } from '@/components/txt';
import { useTone } from '@/hooks/use-tone';
import type { Tutor } from '@/types/session';
import { plural } from '@/utils/format';

type Props = { tutor: Tutor; selected?: boolean; freeSlots: number; onProfile: () => void; onSelect: () => void };

export function TutorCard({ tutor, selected = false, freeSlots, onProfile, onSelect }: Props) {
  const success = useTone('success');
  const neutral = useTone('neutral');

  return (
    <Card selected={selected}>
      <View style={styles.header}>
        <Avatar name={tutor.name} size={52} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Txt variant="h3" numberOfLines={1} style={styles.name}>
              {tutor.name}
            </Txt>
            {tutor.verified ? (
              <View style={[styles.pill, { backgroundColor: success.bg }]}>
                <Txt variant="caption" style={{ color: success.fg, fontWeight: '700' }}>
                  ✓ Verificado
                </Txt>
              </View>
            ) : null}
          </View>
          <Txt variant="small" color="muted" numberOfLines={1}>
            {tutor.career} · {tutor.semester}° semestre
          </Txt>
          {tutor.reputation !== null ? (
            <View style={styles.ratingRow}>
              <RatingStars value={Math.round(tutor.reputation)} size={14} />
              <Txt variant="caption" color="muted">
                {tutor.reputation.toFixed(1)} · {plural(tutor.ratingsCount, 'reseña', 'reseñas')}
              </Txt>
            </View>
          ) : (
            <Txt variant="caption" color="muted">
              Nuevo tutor · sin reseñas aún
            </Txt>
          )}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Txt variant="caption" color="muted">
          🎓 {plural(tutor.stats.sessions, 'tutoría', 'tutorías')}
        </Txt>
        <Txt variant="caption" color="muted">
          ⚡ Responde {tutor.stats.responseTime}
        </Txt>
        <View style={[styles.pill, { backgroundColor: freeSlots > 0 ? success.bg : neutral.bg }]}>
          <Txt variant="caption" style={{ color: freeSlots > 0 ? success.fg : neutral.fg, fontWeight: '700' }}>
            {freeSlots > 0 ? `${plural(freeSlots, 'horario libre', 'horarios libres')}` : 'Sin horarios'}
          </Txt>
        </View>
      </View>

      <View style={styles.buttons}>
        <AppButton label="Ver perfil" variant="secondary" size="sm" onPress={onProfile} style={styles.flex} />
        <AppButton
          label={selected ? '✓ Elegido' : 'Elegir tutor'}
          size="sm"
          onPress={onSelect}
          style={styles.flex}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { flexShrink: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'center' },
  buttons: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
