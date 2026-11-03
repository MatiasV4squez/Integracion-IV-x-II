/** Utilidades del calendario mensual para publicar disponibilidad (fechas como "YYYY-MM-DD", sin zona). */

export const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** Semana de lunes a domingo, como el calendario chileno. */
export const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export type YearMonth = { year: number; month: number }; // month: 1-12

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateKey = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
export const yearMonthOf = (dateKey: string): YearMonth => ({ year: Number(dateKey.slice(0, 4)), month: Number(dateKey.slice(5, 7)) });

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export const compareMonths = (a: YearMonth, b: YearMonth) => a.year * 12 + a.month - (b.year * 12 + b.month);

/** Semanas del mes (lunes a domingo); los huecos antes del 1 y después del último día son null. */
export function monthGrid({ year, month }: YearMonth): (string | null)[][] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // 0 = lunes
  const cells: (string | null)[] = [...Array<null>(firstWeekday).fill(null)];
  for (let day = 1; day <= daysInMonth; day++) cells.push(toDateKey(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Columnas del selector de hora (formato de 12 horas con AM/PM, como el reloj del sistema). */
export const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));
export const MINUTES_60 = Array.from({ length: 60 }, (_, i) => pad(i));
export const PERIODS = ['AM', 'PM'] as const;
export type Period = (typeof PERIODS)[number];

export type Hora12 = { hour: string; minute: string; period: Period };

/** "21:40" -> { hour: "9", minute: "40", period: "PM" }; "00:05" -> 12:05 AM. */
export function to12h(hhmm: string): Hora12 {
  const h = Number(hhmm.slice(0, 2));
  return { hour: String(h % 12 === 0 ? 12 : h % 12), minute: hhmm.slice(3, 5), period: h < 12 ? 'AM' : 'PM' };
}

/** { hour: "9", minute: "40", period: "PM" } -> "21:40"; 12 AM es medianoche y 12 PM, mediodía. */
export function to24h({ hour, minute, period }: Hora12): string {
  const h = Number(hour) % 12 + (period === 'PM' ? 12 : 0);
  return `${pad(h)}:${minute}`;
}

export type Tramo = { start: string; end: string }; // "HH:MM"

/** ¿Se cruzan dos tramos del mismo día? (tocarse en el borde no cuenta: 10:00-11:00 y 11:00-12:00 sí se pueden). */
export const seSolapan = (a: Tramo, b: Tramo) => a.start < b.end && b.start < a.end;

/**
 * Valida el bloque que arma el tutor: término posterior al inicio, que no haya empezado (si es hoy)
 * y que no choque con otro bloque suyo ese día. Devuelve el mensaje de error o null si es válido.
 */
export function validarBloque(day: string, tramo: Tramo, opts: { today: string; nowTime: string; ocupados: readonly Tramo[] }): string | null {
  if (!day) return 'Elige un día.';
  if (!tramo.start) return 'Elige la hora de inicio.';
  if (!tramo.end) return 'Elige la hora de término.';
  if (tramo.end <= tramo.start) return 'La hora de término debe ser posterior a la de inicio.';
  if (day < opts.today || (day === opts.today && tramo.start <= opts.nowTime)) return 'Ese horario ya pasó. Elige uno posterior.';
  const choque = opts.ocupados.find((o) => seSolapan(tramo, o));
  if (choque) return `Se cruza con tu horario de ${choque.start} a ${choque.end}.`;
  return null;
}

/** Duración legible de un tramo: "1 h 30 min". */
export function duracion({ start, end }: Tramo): string {
  const min = (Number(end.slice(0, 2)) * 60 + Number(end.slice(3))) - (Number(start.slice(0, 2)) * 60 + Number(start.slice(3)));
  if (min <= 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}
