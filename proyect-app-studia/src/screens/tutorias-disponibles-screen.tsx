import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Avatar } from '@/components/avatar';
import { CapacityMeter } from '@/components/capacity-meter';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { NoticeBanner } from '@/components/notice-banner';
import { RatingStars } from '@/components/rating-stars';
import { ScreenContainer } from '@/components/screen-container';
import { SectionHeader } from '@/components/section-header';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { useTone } from '@/hooks/use-tone';
import { useUI } from '@/hooks/use-ui';
import { ME, ME_AS_TUTOR } from '@/mocks/sessions';
import { getSubject, SUBJECTS } from '@/mocks/subjects';
import { tutorsForSubject } from '@/mocks/tutors';
import { useSessions } from '@/state/sessions-context';
import type { Tutor } from '@/types/session';
import { formatDate, formatTimeRange, plural } from '@/utils/format';
import { blockOccupancy, createRequest, isBlockFull, MAX_PENDING_REQUESTS } from '@/utils/session-machine';

type Props = { initialSubject?: string; initialTutor?: string };

/** CU-07: el Tutee ve las tutorías disponibles (tutor + horario) y reserva directamente. */
export default function TutoriasDisponiblesScreen({ initialSubject, initialTutor }: Props) {
  const router = useRouter();
  const ui = useUI();
  const { pendingCount, reserved, sessions, run, setLastViewed, myAvailability } = useSessions();

  const [query, setQuery] = useState('');
  const [subjectCode, setSubjectCode] = useState<string | null>(initialSubject ?? null);
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; text: string; sessionId?: string }>>({});

  useEffect(() => {
    if (initialSubject && getSubject(initialSubject)) setSubjectCode(initialSubject);
  }, [initialSubject]);

  const subject = subjectCode ? getSubject(subjectCode) : undefined;
  const limitReached = pendingCount >= MAX_PENDING_REQUESTS;

  const filteredSubjects = SUBJECTS.filter((s) => {
    const q = query.trim().toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.area.toLowerCase().includes(q);
  });

  // El mismo usuario puede ser Tutor y Tutee a la vez: si publicó horarios para esta materia,
  // aparecen aquí igual que los de cualquier otro tutor (con su propio historial de solicitudes).
  const myBlocks = useMemo(
    () => myAvailability.filter((b) => b.subjectCode === subjectCode),
    [myAvailability, subjectCode],
  );
  const meAsTutor: Tutor | null = useMemo(() => {
    if (!subjectCode || myBlocks.length === 0) return null;
    return {
      id: ME_AS_TUTOR.id,
      name: ME_AS_TUTOR.name,
      career: 'Tú, en modo tutor',
      semester: 0,
      bio: '',
      verified: true,
      reputation: ME_AS_TUTOR.reputation,
      ratingsCount: ME_AS_TUTOR.ratingsCount,
      subjectCodes: [subjectCode],
      stats: { sessions: 0, hours: 0, responseTime: '—', repeatRate: 0 },
      bySubject: [],
      recent: [],
      reviews: [],
      availability: myBlocks,
    };
  }, [subjectCode, myBlocks]);

  const tutors = useMemo(() => {
    if (!subjectCode) return [];
    const list = tutorsForSubject(subjectCode);
    const withMe = meAsTutor ? [meAsTutor, ...list] : list;
    if (!initialTutor) return withMe;
    // El tutor pedido explícitamente (desde su perfil o "¿Qué sigue?") aparece primero.
    return [...withMe].sort((a, b) => (a.id === initialTutor ? -1 : b.id === initialTutor ? 1 : 0));
  }, [subjectCode, initialTutor, meAsTutor]);

  const alreadyRequested = (blockId: string) =>
    sessions.some((s) => s.blockId === blockId && s.myRole === 'tutee' && (s.status === 'pendiente' || s.status === 'confirmada'));

  const openDetail = (id: string) => {
    setLastViewed(id);
    router.push({ pathname: '/detalle-sesion', params: { id } });
  };

  const reserve = (tutor: Tutor, blockId: string) => {
    if (!subject) return;
    const block = tutor.availability.find((b) => b.id === blockId);
    if (!block) return;
    const res = run((state) =>
      createRequest(state, {
        tutor: { id: tutor.id, name: tutor.name, reputation: tutor.reputation, ratingsCount: tutor.ratingsCount },
        me: ME,
        subject: { code: subject.code, name: subject.name },
        block,
      }),
    );
    setFeedback((f) => ({
      ...f,
      [blockId]: res.ok
        ? { ok: true, text: `Reservado con ${tutor.name}. Quedó en estado Pendiente.`, sessionId: res.session.id }
        : { ok: false, text: res.error },
    }));
  };

  return (
    <ScreenContainer>
      <View>
        <Txt variant="h1">Tutorías disponibles</Txt>
        <Txt variant="small" color="muted">
          Elige una materia y reserva directamente un horario con el tutor que prefieras.
        </Txt>
      </View>

      {limitReached ? (
        <NoticeBanner
          tone="danger"
          title="Límite alcanzado"
          message={`Ya tienes ${MAX_PENDING_REQUESTS} solicitudes pendientes. Espera una respuesta antes de reservar otra.`}
        />
      ) : null}

      <SectionHeader title="Materia" subtitle={subject ? `${subject.name} · ${subject.code}` : 'Busca o elige una materia'} />
      <TextField placeholder="🔍  Buscar materia, código o área" value={query} onChangeText={setQuery} />
      <View style={styles.wrapRow}>
        {filteredSubjects.map((s) => (
          <Pressable
            key={s.code}
            accessibilityRole="button"
            accessibilityState={{ selected: s.code === subjectCode }}
            onPress={() => setSubjectCode(s.code)}
            style={[
              styles.subjectTile,
              { backgroundColor: s.code === subjectCode ? ui.primarySoft : ui.surface, borderColor: s.code === subjectCode ? ui.primary : ui.border },
            ]}>
            <Txt variant="label" numberOfLines={1}>
              {s.name}
            </Txt>
            <Txt variant="caption" color="muted">
              {s.code} · {plural(tutorsForSubject(s.code).length, 'tutor', 'tutores')}
            </Txt>
          </Pressable>
        ))}
        {filteredSubjects.length === 0 ? <EmptyState icon="🔎" title="Sin resultados" message="Prueba con otro nombre o código." /> : null}
      </View>

      {subject ? (
        <>
          <SectionHeader title="Tutores y horarios" subtitle={`${plural(tutors.length, 'tutor disponible', 'tutores disponibles')} en ${subject.name}`} />

          {tutors.length === 0 ? (
            <EmptyState icon="🌱" title="Sin tutores por ahora" message="Nadie ofrece esta materia todavía. Vuelve a revisar más tarde." />
          ) : (
            tutors.map((tutor) => {
              const isMe = tutor.id === ME.id;
              return (
              <Card key={tutor.id}>
                <View style={styles.header}>
                  <Avatar name={tutor.name} size={52} />
                  <View style={styles.headerText}>
                    <View style={styles.nameRow}>
                      <Txt variant="h3" numberOfLines={1} style={styles.flex}>
                        {tutor.name}
                      </Txt>
                      {tutor.verified ? <VerifiedPill /> : null}
                    </View>
                    <Txt variant="small" color="muted" numberOfLines={1}>
                      {isMe ? tutor.career : `${tutor.career} · ${tutor.semester}° semestre`}
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
                  {isMe ? null : (
                    <AppButton
                      label="Ver perfil"
                      variant="secondary"
                      size="sm"
                      onPress={() => router.push({ pathname: '/tutor/[id]', params: { id: tutor.id, subject: subject.code } })}
                    />
                  )}
                </View>

                {tutor.availability.length === 0 ? (
                  <Txt variant="small" color="muted">
                    Sin horarios publicados.
                  </Txt>
                ) : (
                  <View style={styles.wrapRow}>
                    {tutor.availability.map((block) => {
                      const full = isBlockFull(block, reserved);
                      const mine = alreadyRequested(block.id);
                      const disabled = full || mine || limitReached;
                      const result = feedback[block.id];
                      return (
                        <View key={block.id} style={[styles.blockTile, { borderColor: ui.border }]}>
                          <Txt variant="label">{formatDate(block.startsAt)}</Txt>
                          <Txt variant="small" color="muted">
                            {formatTimeRange(block.startsAt, block.endsAt)}
                          </Txt>
                          <CapacityMeter enrolled={blockOccupancy(block, reserved)} capacity={block.capacity} />
                          {mine ? (
                            <Txt variant="caption" color="primary">
                              Ya reservado
                            </Txt>
                          ) : (
                            <AppButton
                              label="Reservar"
                              size="sm"
                              disabled={disabled}
                              onPress={() => reserve(tutor, block.id)}
                            />
                          )}
                          {result ? (
                            <View style={styles.resultWrap}>
                              <NoticeBanner tone={result.ok ? 'success' : 'danger'} message={result.text} />
                              {result.ok && result.sessionId ? (
                                <AppButton
                                  label="Ver detalle"
                                  variant="secondary"
                                  size="sm"
                                  onPress={() => openDetail(result.sessionId!)}
                                />
                              ) : null}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
              );
            })
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}

function VerifiedPill() {
  const success = useTone('success');
  return (
    <View style={[styles.pill, { backgroundColor: success.bg }]}>
      <Txt variant="caption" style={{ color: success.fg, fontWeight: '700' }}>
        ✓ Verificado
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, flexShrink: 1 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectTile: { minWidth: 150, flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 2 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  blockTile: { minWidth: 150, flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 6 },
  resultWrap: { gap: 6 },
});
