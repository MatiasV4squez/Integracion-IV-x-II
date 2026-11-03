/** Utilidades de fechas y horarios (formato "HH:mm" y fechas ISO). Para mostrar fechas al usuario, ver `format.ts`. */

export const MS = { SECOND: 1000, MINUTE: 60_000, HOUR: 3_600_000, DAY: 86_400_000 } as const;

/** "17:30" -> { hours: 17, minutes: 30 }; null si no es una hora válida. */
export function parseTime(hm: string): { hours: number; minutes: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hm);
  return match ? { hours: Number(match[1]), minutes: Number(match[2]) } : null;
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
