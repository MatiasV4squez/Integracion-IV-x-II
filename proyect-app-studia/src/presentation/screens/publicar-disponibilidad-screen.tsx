import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { isApiEnabled } from '@/di/container';
import { AppButton } from '@/presentation/components/app-button';
import { Card } from '@/presentation/components/card';
import { CapacityMeter } from '@/presentation/components/capacity-meter';
import { EmptyState } from '@/presentation/components/empty-state';
import { FormChipGroup } from '@/presentation/components/form-fields';
import { FormMonthCalendar, FormTimePicker } from '@/presentation/components/month-calendar';
import { NoticeBanner } from '@/presentation/components/notice-banner';
import { ScreenContainer } from '@/presentation/components/screen-container';
import { SectionHeader } from '@/presentation/components/section-header';
import { Txt } from '@/presentation/components/txt';
import { useSubjects } from '@/presentation/hooks/use-subjects';
import { getSubject } from '@/di/demo';
import { createAvailabilitySchema, type AvailabilityForm } from '@/presentation/schemas/availability-schema';
import { useSessions } from '@/presentation/state/sessions-context';
import { formatDate, formatTimeRange } from '@/shared/format';
import { duracion, validarBloque } from '@/domain/disponibilidad/calendar';
import { santiagoDay, santiagoTime, santiagoToIso } from '@/shared/santiago-time';

/** Con backend los bloques no se ligan a una materia: el formulario usa este valor fijo. */
const ALL_SUBJECTS = '*';

const CAPACITIES = [
  { value: 1, label: 'Individual (1)' },
  { value: 2, label: 'Grupal (2)' },
  { value: 3, label: 'Grupal (3)' },
  { value: 4, label: 'Grupal (4)' },
];

/** El Tutor reserva (publica) un horario propio; queda disponible para que un Tutee lo vea y lo reserve. */
export default function PublicarDisponibilidadScreen() {
  const { now, myAvailability, publishAvailability, updateAvailability, removeAvailability } = useSessions();
  const { subjects, fromCache } = useSubjects();
  // Con backend los bloques no se ligan a una materia ni tienen cupos (son individuales) y el día es real.
  const api = isApiEnabled();
  // Día y hora siempre en hora de Chile ("YYYY-MM-DD", "HH:MM"), igual que materias-tutores.
  const toIso = santiagoToIso;
  const today = santiagoDay(0, new Date(now));
  const nowTime = santiagoTime(new Date(now));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  /** Horario que se está editando (null = publicar uno nuevo). */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Horario que pidió quitarse y espera confirmación. */
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // El horario no puede estar en el pasado: se valida contra el reloj de la app.
  const schema = useMemo(() => createAvailabilitySchema({ now, toIso }), [now, toIso]);
  const { control, handleSubmit, reset } = useForm<AvailabilityForm>({
    resolver: zodResolver(schema),
    defaultValues: { subjectCode: api ? ALL_SUBJECTS : '', day: '', startTime: '', endTime: '', capacity: 1 },
    reValidateMode: 'onChange',
  });
  const { subjectCode, day, startTime, endTime } = useWatch({ control });
  const subject = !api && subjectCode ? getSubject(subjectCode) : undefined;

  // Días con horarios propios (punto en el calendario) y los tramos ya ocupados el día elegido.
  const markedDays = useMemo(() => new Set(myAvailability.map((b) => b.startsAt.slice(0, 10))), [myAvailability]);
  const ocupados = useMemo(
    () =>
      myAvailability
        .filter((b) => b.id !== editingId && b.startsAt.slice(0, 10) === day)
        .map((b) => ({ start: b.startsAt.slice(11, 16), end: b.endsAt.slice(11, 16) }))
        .sort((a, b) => a.start.localeCompare(b.start)),
    [myAvailability, editingId, day],
  );
  // El tutor arma el bloque completo (día, inicio y término); se valida en vivo.
  const tramo = { start: startTime ?? '', end: endTime ?? '' };
  const problema = day && tramo.start && tramo.end ? validarBloque(day, tramo, { today, nowTime, ocupados }) : null;
  const bloqueOk = !!day && !!tramo.start && !!tramo.end && !problema;

  /** "2026-11-03T10:00:00-03:00" → día ("2026-11-03") y hora ("10:00") del formulario. */
  const startEditing = (block: (typeof myAvailability)[number]) => {
    setEditingId(block.id);
    setConfirmRemoveId(null);
    setResult(null);
    reset({
      subjectCode: api ? ALL_SUBJECTS : block.subjectCode,
      day: block.startsAt.slice(0, 10),
      startTime: block.startsAt.slice(11, 16),
      endTime: block.endsAt.slice(11, 16),
      capacity: block.capacity,
    });
  };

  const stopEditing = () => {
    setEditingId(null);
    reset({ subjectCode: api ? ALL_SUBJECTS : '', day: '', startTime: '', endTime: '', capacity: 1 });
  };

  const remove = async (id: string) => {
    setConfirmRemoveId(null);
    const res = await removeAvailability(id);
    setResult(res.ok ? { ok: true, text: 'Horario quitado: ya no aparece en la búsqueda de los tutees.' } : { ok: false, text: res.error });
    if (res.ok && editingId === id) stopEditing();
  };

  const onSubmit = handleSubmit(async (values) => {
    if (submitting) return;
    const error = validarBloque(values.day, { start: values.startTime, end: values.endTime }, { today, nowTime, ocupados });
    if (error) {
      setResult({ ok: false, text: error });
      return;
    }
    setSubmitting(true);
    const input = {
      subjectCode: api ? '' : values.subjectCode,
      startsAt: toIso(values.day, values.startTime),
      endsAt: toIso(values.day, values.endTime),
      capacity: api ? 1 : values.capacity,
    };
    const res = editingId ? await updateAvailability(editingId, input) : await publishAvailability(input);
    setSubmitting(false);
    const where = subject ? `para ${subject.name}` : 'para todas las materias en que estás habilitado';
    setResult(
      res.ok
        ? { ok: true, text: editingId ? 'Horario actualizado.' : `Horario publicado. Ya está visible en "Tutorías disponibles" ${where}.` }
        : { ok: false, text: res.error },
    );
    if (res.ok) {
      setEditingId(null);
      reset({ ...values, day: '', startTime: '', endTime: '' });
    }
  });

  return (
    <ScreenContainer topInset={false}>
      <View>
        <Txt variant="h1">Publicar disponibilidad</Txt>
        <Txt variant="small" color="muted">
          Reserva un horario para dictar tutoría. Quedará visible para que los tutees lo reserven.
        </Txt>
      </View>

      {api ? (
        <NoticeBanner
          tone="info"
          message="El horario queda disponible para todas las materias en que estás habilitado como tutor. Cada bloque es individual (1 cupo)."
        />
      ) : (
        <>
          <SectionHeader title="1. Materia" subtitle={subject ? `${subject.name} · ${subject.code}` : 'Elige qué materia vas a reforzar'} />
          <FormChipGroup control={control} name="subjectCode" options={subjects.map((s) => ({ value: s.code, label: s.name }))} />
          {fromCache ? (
            <Txt variant="caption" color="muted">
              Catálogo cargado desde la memoria del dispositivo.
            </Txt>
          ) : null}
        </>
      )}

      <SectionHeader title={api ? '1. Día' : '2. Día'} subtitle="Los días con punto ya tienen horarios publicados" />
      {/* El calendario se vuelve a montar al editar, para abrir en el mes del horario. */}
      <FormMonthCalendar key={editingId ?? 'nuevo'} control={control} name="day" minDate={today} monthsAhead={2} markedDays={markedDays} />

      {day ? (
        <>
          {ocupados.length > 0 ? (
            <Txt variant="small" color="muted">
              Ya tienes horarios el {formatDate(toIso(day, '12:00'))}: {ocupados.map((o) => `${o.start}–${o.end}`).join(', ')}.
            </Txt>
          ) : null}
          <SectionHeader title={api ? '2. Hora de inicio' : '3. Hora de inicio'} subtitle={formatDate(toIso(day, '12:00'))} />
          <FormTimePicker control={control} name="startTime" />
          <SectionHeader title={api ? '3. Hora de término' : '4. Hora de término'} subtitle="Tú decides cuánto dura el bloque" />
          {/* El término se abre una hora después del inicio, para ajustar desde ahí. */}
          <FormTimePicker control={control} name="endTime" defaultTime={tramo.start ? `${String(Math.min(23, Number(tramo.start.slice(0, 2)) + 1)).padStart(2, '0')}:${tramo.start.slice(3)}` : '10:00'} />
          {problema ? <NoticeBanner tone="warning" message={problema} /> : null}
        </>
      ) : (
        <Txt variant="small" color="muted">
          Elige un día para definir el horario.
        </Txt>
      )}

      {api ? null : (
        <>
          <SectionHeader title="5. Cupos" />
          <FormChipGroup control={control} name="capacity" options={CAPACITIES} />
        </>
      )}

      {bloqueOk && day ? (
        <Card>
          <Txt variant="h3">Resumen</Txt>
          <Txt variant="small">
            {subject ? `📘 ${subject.name} · ` : ''}📅 {formatDate(toIso(day, tramo.start))} · {formatTimeRange(toIso(day, tramo.start), toIso(day, tramo.end))} ·{' '}
            {duracion(tramo)}
          </Txt>
        </Card>
      ) : null}

      {result ? <NoticeBanner tone={result.ok ? 'success' : 'danger'} title={result.ok ? 'Horario publicado' : 'No se pudo publicar'} message={result.text} /> : null}

      {editingId ? <NoticeBanner tone="info" message="Estás editando un horario publicado. Cambia el día o la hora y guarda." /> : null}
      <AppButton
        label={submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Publicar horario'}
        disabled={submitting || !bloqueOk}
        onPress={onSubmit}
      />
      {editingId ? <AppButton label="Cancelar edición" variant="ghost" onPress={stopEditing} /> : null}

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
                  <Txt variant="label">{blockSubject?.name ?? (block.subjectCode || 'Todas tus materias')}</Txt>
                  <Txt variant="caption" color="muted">
                    {formatDate(block.startsAt)} · {formatTimeRange(block.startsAt, block.endsAt)}
                  </Txt>
                </View>
                <CapacityMeter enrolled={block.enrolled} capacity={block.capacity} />
              </View>
              {block.enrolled > 0 ? (
                <Txt variant="caption" color="muted">
                  Ya tiene reservas: no se puede editar ni quitar.
                </Txt>
              ) : confirmRemoveId === block.id ? (
                <View style={styles.actions}>
                  <AppButton label="Sí, quitar" size="sm" variant="danger" onPress={() => remove(block.id)} />
                  <AppButton label="No" size="sm" variant="secondary" onPress={() => setConfirmRemoveId(null)} />
                </View>
              ) : (
                <View style={styles.actions}>
                  <AppButton label={editingId === block.id ? 'Editando…' : 'Editar'} size="sm" variant="secondary" disabled={editingId === block.id} onPress={() => startEditing(block)} />
                  <AppButton label="Quitar" size="sm" variant="ghost" onPress={() => setConfirmRemoveId(block.id)} />
                </View>
              )}
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
