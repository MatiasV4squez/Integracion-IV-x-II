import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Card } from '@/components/card';
import { CapacityMeter } from '@/components/capacity-meter';
import { EmptyState } from '@/components/empty-state';
import { FilterChip } from '@/components/filter-chip';
import { NoticeBanner } from '@/components/notice-banner';
import { ScreenContainer } from '@/components/screen-container';
import { SectionHeader } from '@/components/section-header';
import { Txt } from '@/components/txt';
import { SUBJECTS, getSubject } from '@/mocks/subjects';
import { d } from '@/mocks/tutors';
import { useSessions } from '@/state/sessions-context';
import { formatDate, formatTimeRange } from '@/utils/format';

const DAYS = [
  { label: 'Hoy', day: '09-28' },
  { label: 'Mañana', day: '09-29' },
  { label: 'Miér 30', day: '09-30' },
  { label: 'Jue 01', day: '10-01' },
  { label: 'Vie 02', day: '10-02' },
];

const START_TIMES = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const CAPACITIES = [
  { value: 1, label: 'Individual (1)' },
  { value: 2, label: 'Grupal (2)' },
  { value: 3, label: 'Grupal (3)' },
  { value: 4, label: 'Grupal (4)' },
];

function addHour(hm: string): string {
  const [h, m] = hm.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** El Tutor reserva (publica) un horario propio; queda disponible para que un Tutee lo vea y lo reserve. */
export default function PublicarDisponibilidadScreen() {
  const { myAvailability, publishAvailability } = useSessions();

  const [subjectCode, setSubjectCode] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [capacity, setCapacity] = useState(1);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const subject = subjectCode ? getSubject(subjectCode) : undefined;
  const canSubmit = !!(subject && day && startTime);

  const submit = () => {
    if (!subject || !day || !startTime) return;
    const res = publishAvailability({
      subjectCode: subject.code,
      startsAt: d(day, startTime),
      endsAt: d(day, addHour(startTime)),
      capacity,
    });
    setResult(
      res.ok
        ? { ok: true, text: `Horario publicado. Ya está visible en "Tutorías disponibles" para ${subject.name}.` }
        : { ok: false, text: res.error },
    );
    if (res.ok) {
      setDay(null);
      setStartTime(null);
    }
  };

  return (
    <ScreenContainer topInset={false}>
      <View>
        <Txt variant="h1">Publicar disponibilidad</Txt>
        <Txt variant="small" color="muted">
          Reserva un horario para dictar tutoría. Quedará visible para que los tutees lo reserven.
        </Txt>
      </View>

      <SectionHeader title="1. Materia" subtitle={subject ? `${subject.name} · ${subject.code}` : 'Elige qué materia vas a reforzar'} />
      <View style={styles.wrapRow}>
        {SUBJECTS.map((s) => (
          <FilterChip key={s.code} label={s.name} selected={s.code === subjectCode} onPress={() => setSubjectCode(s.code)} />
        ))}
      </View>

      <SectionHeader title="2. Día" />
      <View style={styles.wrapRow}>
        {DAYS.map((item) => (
          <FilterChip key={item.day} label={item.label} selected={day === item.day} onPress={() => setDay(item.day)} />
        ))}
      </View>

      <SectionHeader title="3. Hora de inicio" subtitle="El bloque dura 1 hora" />
      <View style={styles.wrapRow}>
        {START_TIMES.map((time) => (
          <FilterChip key={time} label={time} selected={startTime === time} onPress={() => setStartTime(time)} />
        ))}
      </View>

      <SectionHeader title="4. Cupos" />
      <View style={styles.wrapRow}>
        {CAPACITIES.map((item) => (
          <FilterChip key={item.value} label={item.label} selected={capacity === item.value} onPress={() => setCapacity(item.value)} />
        ))}
      </View>

      {day && startTime ? (
        <Card>
          <Txt variant="h3">Resumen</Txt>
          <Txt variant="small">
            📘 {subject?.name} · 📅 {formatDate(d(day, startTime))} · {formatTimeRange(d(day, startTime), d(day, addHour(startTime)))}
          </Txt>
        </Card>
      ) : null}

      {result ? <NoticeBanner tone={result.ok ? 'success' : 'danger'} title={result.ok ? 'Horario publicado' : 'No se pudo publicar'} message={result.text} /> : null}

      <AppButton label="Publicar horario" disabled={!canSubmit} onPress={submit} />

      <SectionHeader title="Mis horarios publicados" subtitle={`${myAvailability.length} en total`} />
      {myAvailability.length === 0 ? (
        <EmptyState icon="🗓️" title="Aún no publicas horarios" message="Los horarios que publiques aparecerán aquí y en la búsqueda de los tutees." />
      ) : (
        myAvailability.map((block) => {
          const blockSubject = getSubject(block.subjectCode);
          return (
            <Card key={block.id}>
              <View style={styles.between}>
                <View style={styles.flex}>
                  <Txt variant="label">{blockSubject?.name ?? block.subjectCode}</Txt>
                  <Txt variant="caption" color="muted">
                    {formatDate(block.startsAt)} · {formatTimeRange(block.startsAt, block.endsAt)}
                  </Txt>
                </View>
                <CapacityMeter enrolled={block.enrolled} capacity={block.capacity} />
              </View>
            </Card>
          );
        })
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1 },
});
