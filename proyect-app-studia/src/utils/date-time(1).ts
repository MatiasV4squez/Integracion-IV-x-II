/** Utilidades de fechas y horarios (formato "HH:mm" y fechas ISO). Para mostrar fechas al usuario, ver `format.ts`. */

export const MS = { SECOND: 1000, MINUTE: 60_000, HOUR: 3_600_000, DAY: 86_400_000 } as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "17:30" -> { hours: 17, minutes: 30 }; null si no es una hora válida. */
export function parseTime(hm: string): { hours: number; minutes: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hm);
  return match ? { hours: Number(match[1]), minutes: Number(match[2]) } : null;
}

export function isValidTime(hm: string): boolean {
  return parseTime(hm) !== null;
}

/** Suma minutos a una hora "HH:mm" (da la vuelta a las 24 h): ("17:30", 60) -> "18:30". Si la hora es inválida la devuelve igual. */
export function addMinutesToTime(hm: string, minutes: number): string {
  const parsed = parseTime(hm);
  if (!parsed) return hm;
  const total = (((parsed.hours * 60 + parsed.minutes + minutes) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** Suma minutos a una fecha ISO y devuelve otra fecha ISO (en UTC). */
export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * MS.MINUTE).toISOString();
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / MS.MINUTE);
}

/** 90 -> "1 h 30 min", 60 -> "1 h", 45 -> "45 min". */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** ¿La fecha ya pasó respecto de "ahora"? (igual a "ahora" cuenta como pasada). */
export function isPast(iso: string, nowIso: string): boolean {
  return new Date(iso).getTime() <= new Date(nowIso).getTime();
}

/** ¿Ambas fechas caen el mismo día en la zona horaria del dispositivo? */
export function isSameDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Texto relativo: "en 2 h", "hace 3 días", "ahora". */
export function formatRelative(iso: string, nowIso: string): string {
  const diff = new Date(iso).getTime() - new Date(nowIso).getTime();
  const abs = Math.abs(diff);
  if (abs < MS.MINUTE) return 'ahora';
  let text: string;
  if (abs < MS.HOUR) text = `${Math.floor(abs / MS.MINUTE)} min`;
  else if (abs < MS.DAY) text = `${Math.floor(abs / MS.HOUR)} h`;
  else {
    const days = Math.floor(abs / MS.DAY);
    text = `${days} ${days === 1 ? 'día' : 'días'}`;
  }
  return diff > 0 ? `en ${text}` : `hace ${text}`;
}
