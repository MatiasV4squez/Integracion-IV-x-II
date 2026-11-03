import { useRef, useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '@/presentation/components/txt';
import { RADIUS } from '@/presentation/constants/ui';
import { useTone } from '@/presentation/hooks/use-tone';
import { useUI } from '@/presentation/hooks/use-ui';
import { addMonths, compareMonths, HOURS_12, MINUTES_60, MONTH_NAMES, monthGrid, PERIODS, to12h, to24h, WEEKDAY_INITIALS, yearMonthOf, type Hora12 } from '@/domain/disponibilidad/calendar';

type CalendarProps = {
  value: string;
  onChange: (day: string) => void;
  /** Primer día elegible ("YYYY-MM-DD"); los anteriores se ven deshabilitados. */
  minDate: string;
  /** Cuántos meses hacia adelante se puede navegar desde el mes de `minDate`. */
  monthsAhead?: number;
  /** Días que ya tienen horarios publicados (se marcan con un punto). */
  markedDays?: ReadonlySet<string>;
};

/** Calendario de un mes (lunes a domingo) para elegir un día. */
export function MonthCalendar({ value, onChange, minDate, monthsAhead = 2, markedDays }: CalendarProps) {
  const ui = useUI();
  const first = yearMonthOf(minDate);
  const last = addMonths(first, monthsAhead);
  const [shown, setShown] = useState(() => (value ? yearMonthOf(value) : first));
  const canBack = compareMonths(shown, first) > 0;
  const canForward = compareMonths(shown, last) < 0;

  const arrow = (label: string, enabled: boolean, delta: number, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => setShown((m) => addMonths(m, delta))}
      style={[styles.arrow, { borderColor: ui.border, opacity: enabled ? 1 : 0.35 }]}>
      <Txt variant="h3" color="primary">
        {label}
      </Txt>
    </Pressable>
  );

  return (
    <View style={[styles.box, { backgroundColor: ui.surface, borderColor: ui.border }]}>
      <View style={styles.header}>
        {arrow('‹', canBack, -1, 'Mes anterior')}
        <Txt variant="h3" style={styles.monthTitle}>
          {MONTH_NAMES[shown.month - 1].replace(/^./, (c) => c.toUpperCase())} {shown.year}
        </Txt>
        {arrow('›', canForward, 1, 'Mes siguiente')}
      </View>

      <View style={styles.week}>
        {WEEKDAY_INITIALS.map((d, i) => (
          <View key={i} style={styles.weekday}>
            <Txt variant="caption" color="muted" style={styles.cellText}>
              {d}
            </Txt>
          </View>
        ))}
      </View>

      {monthGrid(shown).map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((day, i) => {
            if (!day) return <View key={i} style={styles.cell} />;
            const disabled = day < minDate;
            const selected = day === value;
            const marked = markedDays?.has(day);
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={`${Number(day.slice(8))} de ${MONTH_NAMES[shown.month - 1]}${marked ? ', con horarios publicados' : ''}`}
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => onChange(day)}
                style={[styles.cell, styles.day, selected && { backgroundColor: ui.primary }]}>
                <Txt
                  variant="label"
                  style={[styles.cellText, { color: selected ? ui.onPrimary : disabled ? ui.border : day === minDate ? ui.primaryText : ui.text }]}>
                  {Number(day.slice(8))}
                </Txt>
                <View style={[styles.dot, { backgroundColor: marked ? (selected ? ui.onPrimary : ui.primary) : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

type TimePickerProps = {
  /** "HH:MM" (24 h, como lo guarda materias-tutores) o '' si aún no se elige. */
  value: string;
  onChange: (time: string) => void;
  /** Hora con la que se abre el selector cuando aún no hay valor. */
  defaultTime?: string;
};

const ROW = 40;
const VISIBLE_ROWS = 5;

/**
 * Selector de hora estilo reloj del sistema: un campo "9 | 40 | PM" que al tocarlo abre tres columnas
 * desplazables (hora, minutos, AM/PM) y se confirma con ✓ o se descarta con ✕.
 */
export function TimePicker({ value, onChange, defaultTime = '09:00' }: TimePickerProps) {
  const ui = useUI();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Hora12>(() => to12h(value || defaultTime));
  const shown = value ? to12h(value) : null;

  const abrir = () => {
    setDraft(to12h(value || defaultTime));
    setOpen(true);
  };
  const confirmar = () => {
    onChange(to24h(draft));
    setOpen(false);
  };

  const segment = (text: string, last = false) => (
    <View style={[styles.segment, !last && { borderRightWidth: 1, borderRightColor: ui.border }]}>
      <Txt variant="body" style={{ color: shown ? ui.text : ui.muted }}>
        {text}
      </Txt>
    </View>
  );

  const column = <K extends keyof Hora12>(key: K, options: readonly Hora12[K][], a11y: string) => (
    <TimeColumn options={options} value={draft[key]} label={a11y} onSelect={(option) => setDraft((d) => ({ ...d, [key]: option }))} />
  );

  return (
    <View style={styles.picker}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shown ? `Hora elegida ${shown.hour}:${shown.minute} ${shown.period}. Cambiar` : 'Elegir hora'}
        onPress={() => (open ? setOpen(false) : abrir())}
        style={[styles.field, { borderColor: open ? ui.primary : ui.border, backgroundColor: ui.surface }]}>
        {segment(shown ? shown.hour : 'hora')}
        {segment(shown ? shown.minute : 'minuto')}
        {segment(shown ? shown.period : 'AM/PM', true)}
      </Pressable>

      {open ? (
        <View style={[styles.panel, { borderColor: ui.border, backgroundColor: ui.surface }]}>
          <View style={styles.columns}>
            {column('hour', HOURS_12, 'Hora')}
            <View style={[styles.divider, { backgroundColor: ui.border }]} />
            {column('minute', MINUTES_60, 'Minutos')}
            <View style={[styles.divider, { backgroundColor: ui.border }]} />
            {column('period', PERIODS, 'AM o PM')}
          </View>
          <View style={[styles.panelFooter, { borderTopColor: ui.border }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Confirmar hora" onPress={confirmar} style={styles.footerButton}>
              <Txt variant="h3" color="primary">
                ✓
              </Txt>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: ui.border }]} />
            <Pressable accessibilityRole="button" accessibilityLabel="Cancelar" onPress={() => setOpen(false)} style={styles.footerButton}>
              <Txt variant="h3" color="muted">
                ✕
              </Txt>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Columna desplazable del selector de hora; al abrirse se ubica en el valor elegido. */
function TimeColumn<V extends string>({ options, value, label, onSelect }: { options: readonly V[]; value: V; label: string; onSelect: (v: V) => void }) {
  const ui = useUI();
  const ref = useRef<ScrollView>(null);
  // Se desplaza una sola vez, al montarse (contentOffset no funciona en la web).
  const centrar = () => ref.current?.scrollTo({ y: Math.max(0, (options.indexOf(value) - 2) * ROW), animated: false });

  return (
    <ScrollView ref={ref} onLayout={centrar} style={[styles.column, { height: ROW * VISIBLE_ROWS }]} showsVerticalScrollIndicator={false} accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${label} ${option}`}
            onPress={() => onSelect(option)}
            style={[styles.option, selected && { backgroundColor: ui.primary }]}>
            <Txt variant="body" style={{ color: selected ? ui.onPrimary : ui.text, fontWeight: selected ? '700' : '400' }}>
              {option}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Versiones conectadas a react-hook-form: muestran el error de validación debajo. */
export function FormMonthCalendar<T extends FieldValues>({ control, name, ...rest }: Omit<CalendarProps, 'value' | 'onChange'> & { control: Control<T>; name: Path<T> }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={styles.group}>
          <MonthCalendar {...rest} value={String(field.value ?? '')} onChange={field.onChange} />
          <FieldError message={fieldState.error?.message} />
        </View>
      )}
    />
  );
}

export function FormTimePicker<T extends FieldValues>({ control, name, defaultTime }: { control: Control<T>; name: Path<T>; defaultTime?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={styles.group}>
          <TimePicker value={String(field.value ?? '')} onChange={field.onChange} defaultTime={defaultTime} />
          <FieldError message={fieldState.error?.message} />
        </View>
      )}
    />
  );
}

function FieldError({ message }: { message?: string }) {
  const danger = useTone('danger');
  if (!message) return null;
  return (
    <Txt variant="caption" style={{ color: danger.fg }} accessibilityRole="alert">
      {message}
    </Txt>
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  box: { borderWidth: 1, borderRadius: RADIUS.lg, padding: 12, gap: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  monthTitle: { flex: 1, textAlign: 'center' },
  arrow: { width: 36, height: 36, borderRadius: RADIUS.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, aspectRatio: 1, maxHeight: 48, alignItems: 'center', justifyContent: 'center' },
  day: { borderRadius: RADIUS.sm },
  weekday: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  cellText: { textAlign: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  picker: { gap: 6, alignSelf: 'flex-start', width: '100%', maxWidth: 300 },
  field: { flexDirection: 'row', minHeight: 44, borderWidth: 1, borderRadius: RADIUS.sm, overflow: 'hidden' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  panel: { borderWidth: 1, borderRadius: RADIUS.md, overflow: 'hidden', boxShadow: '0 8px 24px rgba(23, 42, 72, 0.12)' },
  columns: { flexDirection: 'row' },
  column: { flex: 1 },
  option: { height: ROW, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, borderRadius: RADIUS.sm },
  divider: { width: 1 },
  panelFooter: { flexDirection: 'row', borderTopWidth: 1, height: 44 },
  footerButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
