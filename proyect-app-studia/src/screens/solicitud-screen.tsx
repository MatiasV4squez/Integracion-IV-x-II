import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { CapacityMeter } from '@/components/capacity-meter';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { FilterChip } from '@/components/filter-chip';
import { NoticeBanner } from '@/components/notice-banner';
import { ScreenContainer } from '@/components/screen-container';
import { SectionHeader } from '@/components/section-header';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { TutorCard } from '@/components/tutor-card';
import { Txt } from '@/components/txt';
import { useUI } from '@/hooks/use-ui';
import { ME } from '@/mocks/sessions';
import { getSubject, SUBJECTS } from '@/mocks/subjects';
import { getTutorById, tutorsForSubject } from '@/mocks/tutors';
import { useSessions } from '@/state/sessions-context';
import type { AvailabilityBlock, Tutor } from '@/types/session';
import { formatDate, formatTimeRange, plural } from '@/utils/format';
import {
  blockOccupancy,
  createRequest,
  isBlockFull,
  MAX_PENDING_REQUESTS,
  REQUEST_EXPIRY_HOURS,
} from '@/utils/session-machine';

type Props = { initialSubject?: string; initialTutor?: string };

/** CU-07 / CU-08: buscar tutor por materia, ver su perfil, elegir horario con cupos y enviar la solicitud. */
export default function SolicitudScreen({ initialSubject, initialTutor }: Props) {
  const router = useRouter();
  const ui = useUI();
  const { sessions, pendingCount, reserved, run, setLastViewed } = useSessions();

  const [query, setQuery] = useState('');
  const [subjectCode, setSubjectCode] = useState<string | null>(null);
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [unit, setUnit] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [blockId, setBlockId] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string; sessionId?: string } | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Permite llegar desde otra pantalla con materia/tutor ya elegidos (?subject=&tutor=).
  useEffect(() => {
    const preTutor = getTutorById(initialTutor);
    const code = initialSubject && getSubject(initialSubject) ? initialSubject : preTutor?.subjectCodes[0];
    if (code) {
      setSubjectCode(code);
      setTutorId(preTutor && preTutor.subjectCodes.includes(code) ? preTutor.id : null);
      setUnit(null);
      setBlockId(null);
      setResult(null);
    }
  }, [initialSubject, initialTutor]);

  const subject = subjectCode ? getSubject(subjectCode) : undefined;
  const tutors = useMemo(() => (subjectCode ? tutorsForSubject(subjectCode) : []), [subjectCode]);
  const tutor: Tutor | undefined = tutors.find((t) => t.id === tutorId);

  const filteredSubjects = SUBJECTS.filter((s) => {
    const q = query.trim().toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.area.toLowerCase().includes(q);
  });

  const myRequests = useMemo(
    () =>
      sessions
        .filter((s) => s.myRole === 'tutee')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [sessions],
  );
  const confirmedCount = myRequests.filter((s) => s.status === 'confirmada').length;
  const limitReached = pendingCount >= MAX_PENDING_REQUESTS;

  const days = useMemo(() => {
    const map = new Map<string, AvailabilityBlock[]>();
    for (const block of tutor?.availability ?? []) {
      const key = formatDate(block.startsAt);
      map.set(key, [...(map.get(key) ?? []), block]);
    }
    return [...map.entries()];
  }, [tutor]);

  const freeSlots = (t: Tutor) => t.availability.filter((b) => !isBlockFull(b, reserved)).length;
  const alreadyRequested = (blockIdToCheck: string) =>
    sessions.some((s) => s.blockId === blockIdToCheck && s.myRole === 'tutee' && (s.status === 'pendiente' || s.status === 'confirmada'));

  const selectedBlock = tutor?.availability.find((b) => b.id === blockId);
  const canSubmit = !!(tutor && subject && selectedBlock) && !limitReached;

  const pickSubject = (code: string) => {
    setSubjectCode(code);
    setTutorId(null);
    setUnit(null);
    setBlockId(null);
    setResult(null);
  };
  const pickTutor = (id: string) => {
    setTutorId(id);
    setBlockId(null);
    setResult(null);
  };
  const openDetail = (id: string) => {
    setLastViewed(id);
    router.push({ pathname: '/detalle-sesion', params: { id } });
  };

  const submit = () => {
    if (!tutor || !subject || !selectedBlock) return;
    const res = run((state) =>
      createRequest(state, {
        tutor: { id: tutor.id, name: tutor.name, reputation: tutor.reputation, ratingsCount: tutor.ratingsCount },
        me: ME,
        subject: { code: subject.code, name: subject.name },
        block: selectedBlock,
        unit: unit ?? undefined,
        note,
      }),
    );
    if (res.ok) {
      setResult({ ok: true, text: `Solicitud enviada a ${tutor.name}. Quedó en estado Pendiente.`, sessionId: res.session.id });
      setBlockId(null);
      setNote('');
      setUnit(null);
    } else {
      setResult({ ok: false, text: res.error });
    }
  };

  const step = !subject ? 1 : !tutor ? 2 : 3;
  const visibleRequests = showAll ? myRequests : myRequests.slice(0, 4);

  return (
    <ScreenContainer>
      <View>
        <Txt variant="h1">Solicitar tutoría</Txt>
        <Txt variant="small" color="muted">
          Elige una materia, revisa a los tutores y reserva un horario.
        </Txt>
      </View>

      {/* Resumen de solicitudes */}
      <Card>
        <View style={styles.between}>
          <Txt variant="h3">Mis solicitudes</Txt>
          <Txt variant="label" color={limitReached ? undefined : 'primary'} style={limitReached ? { color: '#A4262C' } : undefined}>
            {pendingCount}/{MAX_PENDING_REQUESTS} pendientes
          </Txt>
        </View>
        <View style={styles.meter}>
          {Array.from({ length: MAX_PENDING_REQUESTS }, (_, i) => (
            <View key={i} style={[styles.meterSlot, { backgroundColor: i < pendingCount ? (limitReached ? '#DC2626' : ui.primary) : ui.border }]} />
          ))}
        </View>
        <View style={styles.counters}>
          <Txt variant="small" color="muted">
            ⏳ {pendingCount} pendientes
          </Txt>
          <Txt variant="small" color="muted">
            ✅ {confirmedCount} confirmadas
          </Txt>
          <Txt variant="small" color="muted">
            📨 {myRequests.length} en total
          </Txt>
        </View>
      </Card>

      {limitReached ? (
        <NoticeBanner tone="danger" title="Límite alcanzado" message={`Ya tienes ${MAX_PENDING_REQUESTS} solicitudes pendientes. Espera una respuesta antes de crear otra.`} />
      ) : null}

      {/* Paso a paso */}
      <View style={styles.stepper}>
        {['Materia', 'Tutor', 'Horario'].map((label, i) => {
          const n = i + 1;
          const done = n < step || (n === 3 && !!selectedBlock);
          const current = n === step && !done;
          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepDot, { backgroundColor: done ? ui.primary : current ? ui.primarySoft : ui.surfaceAlt, borderColor: done || current ? ui.primary : ui.border }]}>
                <Txt variant="caption" style={{ color: done ? ui.onPrimary : current ? ui.primary : ui.muted, fontWeight: '700' }}>
                  {done ? '✓' : n}
                </Txt>
              </View>
              <Txt variant="caption" color={done || current ? 'text' : 'muted'}>
                {label}
              </Txt>
            </View>
          );
        })}
      </View>

      {/* 1. Materia */}
      <SectionHeader title="1. Materia" subtitle={subject ? `${subject.name} · ${subject.code}` : 'Busca o elige una materia'} />
      <TextField placeholder="🔍  Buscar materia, código o área" value={query} onChangeText={setQuery} />
      <View style={styles.wrapRow}>
        {filteredSubjects.map((s) => (
          <Pressable
            key={s.code}
            accessibilityRole="button"
            accessibilityState={{ selected: s.code === subjectCode }}
            onPress={() => pickSubject(s.code)}
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

      {/* 2. Tutores */}
      {subject ? (
        <>
          <SectionHeader title="2. Tutor" subtitle={`${plural(tutors.length, 'tutor disponible', 'tutores disponibles')} en ${subject.name}`} />
          {tutors.map((t) => (
            <TutorCard
              key={t.id}
              tutor={t}
              selected={t.id === tutorId}
              freeSlots={freeSlots(t)}
              onProfile={() => router.push({ pathname: '/tutor/[id]', params: { id: t.id, subject: subject.code } })}
              onSelect={() => pickTutor(t.id)}
            />
          ))}
        </>
      ) : null}

      {/* 3. Horario */}
      {subject && tutor ? (
        <>
          <SectionHeader title="3. Horario" subtitle={`Con ${tutor.name}`} />

          <Card>
            <Txt variant="label">¿Qué unidad quieres reforzar? (opcional)</Txt>
            <View style={styles.wrapRow}>
              {subject.units.map((u) => (
                <FilterChip key={u} label={u} selected={unit === u} onPress={() => setUnit(unit === u ? null : u)} />
              ))}
            </View>
            <TextField
              label="Cuéntale al tutor qué necesitas"
              placeholder="Ej: Me cuesta la regla de la cadena, traigo ejercicios de la guía 2."
              value={note}
              onChangeText={setNote}
              multiline
            />
          </Card>

          {days.length === 0 ? (
            <EmptyState icon="📅" title="Sin horarios disponibles" message="Prueba con otro tutor." />
          ) : (
            days.map(([day, blocks]) => (
              <View key={day} style={styles.day}>
                <Txt variant="label" color="muted">
                  {day}
                </Txt>
                <View style={styles.wrapRow}>
                  {blocks.map((block) => {
                    const full = isBlockFull(block, reserved);
                    const mine = alreadyRequested(block.id);
                    const disabled = full || mine;
                    const selected = block.id === blockId;
                    return (
                      <Pressable
                        key={block.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled }}
                        disabled={disabled}
                        onPress={() => {
                          setBlockId(block.id);
                          setResult(null);
                        }}
                        style={[
                          styles.blockTile,
                          {
                            backgroundColor: selected ? ui.primarySoft : ui.surface,
                            borderColor: selected ? ui.primary : ui.border,
                            opacity: disabled ? 0.5 : 1,
                          },
                        ]}>
                        <Txt variant="label" color={selected ? 'primary' : 'text'}>
                          {formatTimeRange(block.startsAt, block.endsAt)}
                        </Txt>
                        <CapacityMeter enrolled={blockOccupancy(block, reserved)} capacity={block.capacity} />
                        {mine ? (
                          <Txt variant="caption" color="primary">
                            Ya solicitado
                          </Txt>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </>
      ) : null}

      {/* Resumen + enviar */}
      {subject && tutor && selectedBlock ? (
        <Card>
          <Txt variant="h3">Resumen de tu solicitud</Txt>
          <Txt variant="small">
            📘 {subject.name}
            {unit ? ` · ${unit}` : ''}
          </Txt>
          <Txt variant="small">👤 {tutor.name}</Txt>
          <Txt variant="small">
            📅 {formatDate(selectedBlock.startsAt)} · {formatTimeRange(selectedBlock.startsAt, selectedBlock.endsAt)}
          </Txt>
        </Card>
      ) : null}

      {subject && tutor ? (
        <NoticeBanner tone="info" message={`El tutor tiene ${REQUEST_EXPIRY_HOURS} horas para responder. Si no lo hace, la solicitud expira y el cupo se libera.`} />
      ) : null}

      {result ? (
        <View style={styles.gap8}>
          <NoticeBanner tone={result.ok ? 'success' : 'danger'} title={result.ok ? 'Solicitud enviada' : 'No se pudo enviar'} message={result.text} />
          {result.ok && result.sessionId ? (
            <AppButton label="Ver detalle de la solicitud" variant="secondary" onPress={() => openDetail(result.sessionId!)} />
          ) : null}
        </View>
      ) : null}

      {subject && tutor ? (
        <View style={styles.gap8}>
          <AppButton label="Enviar solicitud" disabled={!canSubmit} onPress={submit} />
          {!canSubmit && !limitReached ? (
            <Txt variant="caption" color="muted" style={styles.center}>
              Elige un horario para poder enviar la solicitud.
            </Txt>
          ) : null}
        </View>
      ) : null}

      {/* Historial de solicitudes */}
      <SectionHeader
        title="Historial de solicitudes"
        subtitle={`${plural(myRequests.length, 'solicitud', 'solicitudes')} en total · ${pendingCount} pendientes`}
        actionLabel={myRequests.length > 4 ? (showAll ? 'Ver menos' : 'Ver todas') : undefined}
        onAction={() => setShowAll((v) => !v)}
      />
      {visibleRequests.map((s) => (
        <Card key={s.id} onPress={() => openDetail(s.id)}>
          <View style={styles.between}>
            <View style={styles.flex}>
              <Txt variant="label">{s.subject.name}</Txt>
              <Txt variant="caption" color="muted">
                {s.tutor.name} · {formatDate(s.startsAt)} · {formatTimeRange(s.startsAt, s.endsAt)}
              </Txt>
            </View>
            <StatusBadge status={s.status} />
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  meter: { flexDirection: 'row', gap: 6 },
  meterSlot: { flex: 1, height: 8, borderRadius: 4 },
  counters: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  stepItem: { alignItems: 'center', gap: 4, flex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectTile: { minWidth: 150, flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 2 },
  day: { gap: 8 },
  blockTile: { minWidth: 140, padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 6 },
  gap8: { gap: 8 },
  center: { textAlign: 'center' },
});
