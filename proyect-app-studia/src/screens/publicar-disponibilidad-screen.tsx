import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Card } from '@/components/card';
import { CapacityMeter } from '@/components/capacity-meter';
import { EmptyState } from '@/components/empty-state';
import { FormChipGroup } from '@/components/form-fields';
import { NoticeBanner } from '@/components/notice-banner';
import { ScreenContainer } from '@/components/screen-container';
import { SectionHeader } from '@/components/section-header';
import { Txt } from '@/components/txt';
import { AVAILABILITY } from '@/constants/app-config';
import { useSubjects } from '@/hooks/use-subjects';
import { getSubject } from '@/mocks/subjects';
import { d } from '@/mocks/tutors';
import { createAvailabilitySchema, type AvailabilityForm } from '@/schemas/availability-schema';
import { useSessions } from '@/state/sessions-context';
import { addMinutesToTime } from '@/utils/date-time';
import { formatDate, formatTimeRange } from '@/utils/format';

const DAYS = [
  { label: 'Hoy', value: '09-28' },
  { label: 'Mañana', value: '09-29' },
  { label: 'Miér 30', value: '09-30' },
  { label: 'Jue 01', value: '10-01' },
  { label: 'Vie 02', value: '10-02' },
];

const START_TIMES = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => ({ value: time, label: time }));

const CAPACITIES = [
  { value: 1, label: 'Individual (1)' },
  { value: 2, label: 'Grupal (2)' },
  { value: 3, label: 'Grupal (3)' },
  { value: 4, label: 'Grupal (4)' },
];

/** El Tutor reserva (publica) un horario propio; queda disponible para que un Tutee lo vea y lo reserve. */
export default function PublicarDisponibilidadScreen() {
  const { now, myAvailability, publishAvailability } = useSessions();
  const { subjects, fromCache } = useSubjects();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  // El horario no puede estar en el pasado: se valida contra el reloj de la app.
  const schema = useMemo(() => createAvailabilitySchema({ now, toIso: d }), [now]);
  const { control, handleSubmit, reset } = useForm<AvailabilityForm>({
    resolver: zodResolver(schema),
    defaultValues: { subjectCode: '', day: '', startTime: '', capacity: 1 },
    reValidateMode: 'onChange',
  });
  const { subjectCode, day, startTime } = useWatch({ control });
  const subject = subjectCode ? getSubject(subjectCode) : undefined;

  const onSubmit = handleSubmit((values) => {
    const res = publishAvailability({
      subjectCode: values.subjectCode,
      startsAt: d(values.day, values.startTime),
      endsAt: d(values.day, addMinutesToTime(values.startTime, AVAILABILITY.BLOCK_MINUTES)),
      capacity: values.capacity,
    });
    setResult(
      res.ok
        ? { ok: true, text: `Horario publicado. Ya está visible en "Tutorías disponibles" para ${getSubject(values.subjectCode)?.name ?? values.subjectCode}.` }
        : { ok: false, text: res.error },
    );
    if (res.ok) reset({ ...values, day: '', startTime: '' });
  });

  return (
    <ScreenContainer topInset={false}>
      <View>
        <Txt variant="h1">Publicar disponibilidad</Txt>
        <Txt variant="small" color="muted">
          Reserva un horario para dictar tutoría. Quedará visible para que los tutees lo reserven.
        </Txt>
      </View>

      <SectionHeader title="1. Materia" subtitle={subject ? `${subject.name} · ${subject.code}` : 'Elige qué materia vas a reforzar'} />
      <FormChipGroup control={control} name="subjectCode" options={subjects.map((s) => ({ value: s.code, label: s.name }))} />
      {fromCache ? (
        <Txt variant="caption" color="muted">
          Catálogo cargado desde la memoria del dispositivo.
        </Txt>
      ) : null}

      <SectionHeader title="2. Día" />
      <FormChipGroup control={control} name="day" options={DAYS} />

      <SectionHeader title="3. Hora de inicio" subtitle="El bloque dura 1 hora" />
      <FormChipGroup control={control} name="startTime" options={START_TIMES} />

      <SectionHeader title="4. Cupos" />
      <FormChipGroup control={control} name="capacity" options={CAPACITIES} />

      {day && startTime ? (
        <Card>
          <Txt variant="h3">Resumen</Txt>
          <Txt variant="small">
            📘 {subject?.name} · 📅 {formatDate(d(day, startTime))} · {formatTimeRange(d(day, startTime), d(day, addMinutesToTime(startTime, AVAILABILITY.BLOCK_MINUTES)))}
          </Txt>
        </Card>
      ) : null}

      {result ? <NoticeBanner tone={result.ok ? 'success' : 'danger'} title={result.ok ? 'Horario publicado' : 'No se pudo publicar'} message={result.text} /> : null}

      <AppButton label="Publicar horario" onPress={onSubmit} />

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
