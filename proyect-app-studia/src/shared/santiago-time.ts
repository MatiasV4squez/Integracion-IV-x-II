/**
 * materias-tutores guarda los bloques como día + hora local de Santiago ("2026-10-30", "10:00").
 * Estas funciones convierten entre ese formato y un ISO con el offset correcto (-03/-04 según DST).
 */
const TZ = 'America/Santiago';

function santiagoOffsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((asUtc - utcMs) / 60000);
}

const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');

/** ("2026-10-30", "10:00") -> "2026-10-30T10:00:00-03:00" */
export function santiagoToIso(day: string, hm: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const [h, min] = hm.split(':').map(Number);
  const naiveUtc = Date.UTC(y, m - 1, d, h, min);
  // Dos pasadas para cubrir el cambio de horario.
  let offset = santiagoOffsetMinutes(naiveUtc);
  offset = santiagoOffsetMinutes(naiveUtc - offset * 60000);
  const sign = offset < 0 ? '-' : '+';
  return `${day}T${hm}:00${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
}

/** Fecha local de Santiago (YYYY-MM-DD) de hoy + `daysAhead`. */
export function santiagoDay(daysAhead = 0, from = new Date()): string {
  const ms = from.getTime() + daysAhead * 86400000;
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

/** Hora local de Santiago ("HH:MM") de un instante. */
export function santiagoTime(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
}
