import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Avatar } from '@/components/avatar';
import { CapacityMeter } from '@/components/capacity-meter';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { RatingStars } from '@/components/rating-stars';
import { ReviewCard } from '@/components/review-card';
import { ScreenContainer } from '@/components/screen-container';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { StatTile } from '@/components/stat-tile';
import { Txt } from '@/components/txt';
import { getSubject } from '@/mocks/subjects';
import { getTutorById } from '@/mocks/tutors';
import { useTone } from '@/hooks/use-tone';
import { useUI } from '@/hooks/use-ui';
import { useSessions } from '@/state/sessions-context';
import type { AvailabilityBlock } from '@/types/session';
import { formatDate, formatTimeRange, plural } from '@/utils/format';
import { blockOccupancy, isBlockFull } from '@/utils/session-machine';

type Tab = 'resumen' | 'resenas' | 'horarios' | 'historial';

type Props = { tutorId: string; subjectCode?: string };

/** Perfil público de un Tutor: resumen, reseñas, horarios con cupos e historial. */
export default function TutorPerfilScreen({ tutorId, subjectCode }: Props) {
  const router = useRouter();
  const ui = useUI();
  const success = useTone('success');
  const { reserved } = useSessions();
  const tutor = getTutorById(tutorId);
  const [tab, setTab] = useState<Tab>('resumen');

  const distribution = useMemo(
    () => [5, 4, 3, 2, 1].map((star) => ({ star, count: tutor?.reviews.filter((r) => r.rating === star).length ?? 0 })),
    [tutor],
  );

  const days = useMemo(() => {
    const map = new Map<string, AvailabilityBlock[]>();
    for (const block of tutor?.availability ?? []) {
      const key = formatDate(block.startsAt);
      map.set(key, [...(map.get(key) ?? []), block]);
    }
    return [...map.entries()];
  }, [tutor]);

  const back = () => (router.canGoBack() ? router.back() : router.navigate('/solicitud'));

  if (!tutor) {
    return (
      <ScreenContainer>
        <EmptyState icon="🙈" title="No encontramos a este tutor" message="Vuelve a la búsqueda e intenta con otro." />
        <AppButton label="Volver" onPress={back} />
      </ScreenContainer>
    );
  }

  const requestWithTutor = () =>
    router.navigate({
      pathname: '/solicitud',
      params: { tutor: tutor.id, subject: subjectCode ?? tutor.subjectCodes[0] },
    });

  const maxSessions = Math.max(1, ...tutor.bySubject.map((s) => s.sessions));

  return (
    <ScreenContainer>
      <Pressable accessibilityRole="button" onPress={back} hitSlop={8} style={styles.back}>
        <Txt variant="label" color="primary">
          ‹ Volver
        </Txt>
      </Pressable>

      <Card>
        <View style={styles.headerRow}>
          <Avatar name={tutor.name} size={72} />
          <View style={styles.flex}>
            <Txt variant="h2">{tutor.name}</Txt>
            <Txt variant="small" color="muted">
              {tutor.career} · {tutor.semester}° semestre
            </Txt>
            {tutor.reputation !== null ? (
              <View style={styles.ratingRow}>
                <RatingStars value={Math.round(tutor.reputation)} size={16} />
                <Txt variant="label">{tutor.reputation.toFixed(1)}</Txt>
                <Txt variant="small" color="muted">
                  ({plural(tutor.ratingsCount, 'reseña', 'reseñas')})
                </Txt>
              </View>
            ) : (
              <Txt variant="small" color="muted">
                Nuevo tutor · sin reseñas aún
              </Txt>
            )}
            {tutor.verified ? (
              <View style={[styles.pill, { backgroundColor: success.bg }]}>
                <Txt variant="caption" style={{ color: success.fg, fontWeight: '700' }}>
                  ✓ Certificado de notas verificado
                </Txt>
              </View>
            ) : (
              <Txt variant="caption" color="muted">
                Certificado en revisión
              </Txt>
            )}
          </View>
        </View>
        <AppButton label="Solicitar tutoría con este tutor" onPress={requestWithTutor} />
      </Card>

      <View style={styles.tiles}>
        <StatTile value={String(tutor.stats.sessions)} label="Tutorías" />
        <StatTile value={`${tutor.stats.hours} h`} label="Horas dadas" />
        <StatTile value={tutor.stats.responseTime} label="Responde en" />
        <StatTile value={`${tutor.stats.repeatRate}%`} label="Repiten" />
      </View>

      <SegmentedTabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { key: 'resumen', label: 'Resumen' },
          { key: 'resenas', label: `Reseñas (${tutor.reviews.length})` },
          { key: 'horarios', label: 'Horarios' },
          { key: 'historial', label: 'Historial' },
        ]}
      />

      {tab === 'resumen' ? (
        <>
          <Card>
            <Txt variant="h3">Sobre {tutor.name.split(' ')[0]}</Txt>
            <Txt variant="body">{tutor.bio}</Txt>
          </Card>
          <Card>
            <Txt variant="h3">Materias que enseña</Txt>
            {tutor.subjectCodes.map((code) => {
              const subject = getSubject(code);
              return (
                <View key={code} style={styles.subjectRow}>
                  <View style={styles.flex}>
                    <Txt variant="label">{subject?.name ?? code}</Txt>
                    <Txt variant="caption" color="muted">
                      {code} · {subject?.units.slice(0, 2).join(' · ')}…
                    </Txt>
                  </View>
                  <AppButton
                    label="Solicitar"
                    size="sm"
                    variant="secondary"
                    onPress={() => router.navigate({ pathname: '/solicitud', params: { tutor: tutor.id, subject: code } })}
                  />
                </View>
              );
            })}
          </Card>
          {tutor.reviews.length > 0 ? (
            <Card>
              <Txt variant="h3">Distribución de calificaciones</Txt>
              {distribution.map(({ star, count }) => (
                <View key={star} style={styles.barRow}>
                  <Txt variant="caption" color="muted" style={styles.starLabel}>
                    {star} ★
                  </Txt>
                  <View style={[styles.track, { backgroundColor: ui.surfaceAlt }]}>
                    <View style={[styles.fill, { backgroundColor: ui.star, width: `${(count / tutor.reviews.length) * 100}%` }]} />
                  </View>
                  <Txt variant="caption" color="muted" style={styles.countLabel}>
                    {count}
                  </Txt>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

      {tab === 'resenas' ? (
        tutor.reviews.length > 0 ? (
          tutor.reviews.map((review) => <ReviewCard key={review.id} review={review} />)
        ) : (
          <EmptyState icon="💬" title="Aún no hay reseñas" message="Este tutor todavía no recibe calificaciones. ¡Puedes ser de los primeros!" />
        )
      ) : null}

      {tab === 'horarios' ? (
        days.length > 0 ? (
          days.map(([day, blocks]) => (
            <Card key={day}>
              <Txt variant="h3">{day}</Txt>
              {blocks.map((block) => {
                const full = isBlockFull(block, reserved);
                return (
                  <View key={block.id} style={[styles.blockRow, { borderColor: ui.border }]}>
                    <View style={styles.flex}>
                      <Txt variant="label">{formatTimeRange(block.startsAt, block.endsAt)}</Txt>
                      <Txt variant="caption" color="muted">
                        Capacidad máxima: {block.capacity}
                      </Txt>
                    </View>
                    <CapacityMeter enrolled={blockOccupancy(block, reserved)} capacity={block.capacity} />
                  </View>
                );
              })}
            </Card>
          ))
        ) : (
          <EmptyState icon="📅" title="Sin horarios publicados" />
        )
      ) : null}

      {tab === 'historial' ? (
        tutor.bySubject.length > 0 ? (
          <>
            <Card>
              <Txt variant="h3">Tutorías por materia</Txt>
              {tutor.bySubject.map(({ code, sessions }) => (
                <View key={code} style={styles.gap6}>
                  <View style={styles.between}>
                    <Txt variant="label">{getSubject(code)?.name ?? code}</Txt>
                    <Txt variant="caption" color="muted">
                      {plural(sessions, 'tutoría', 'tutorías')}
                    </Txt>
                  </View>
                  <View style={[styles.track, { backgroundColor: ui.surfaceAlt }]}>
                    <View style={[styles.fill, { backgroundColor: ui.primary, width: `${(sessions / maxSessions) * 100}%` }]} />
                  </View>
                </View>
              ))}
            </Card>
            <Card>
              <Txt variant="h3">Últimas tutorías</Txt>
              {tutor.recent.map((item) => (
                <View key={`${item.subjectCode}-${item.date}`} style={[styles.blockRow, { borderColor: ui.border }]}>
                  <View style={styles.flex}>
                    <Txt variant="label">{getSubject(item.subjectCode)?.name ?? item.subjectCode}</Txt>
                    <Txt variant="caption" color="muted">
                      {formatDate(item.date)}
                    </Txt>
                  </View>
                  <RatingStars value={item.rating} size={14} />
                </View>
              ))}
            </Card>
          </>
        ) : (
          <EmptyState icon="🌱" title="Aún sin historial" message="Este tutor todavía no completa tutorías en la plataforma." />
        )
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  back: { alignSelf: 'flex-start', paddingVertical: 4 },
  headerRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starLabel: { width: 28 },
  countLabel: { width: 20, textAlign: 'right' },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, borderTopWidth: 1 },
  gap6: { gap: 6 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
});
