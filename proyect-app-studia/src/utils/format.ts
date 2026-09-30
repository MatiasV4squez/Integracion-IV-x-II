const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const pad = (n: number) => String(n).padStart(2, '0');

/** "lun 28 sep" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "16:00" */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "16:00 – 17:00" */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

/** "lun 28 sep, 16:00" */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** "MV" para "Matías Valenzuela" */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** plural(2, 'sesión', 'sesiones') -> "2 sesiones" */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

const DAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "miércoles 30 de septiembre" */
export function formatDayLong(iso: string): string {
  const d = new Date(iso);
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`;
}

/**
 * Cuenta regresiva estilo reloj: "01:29" + "58s". Desde 1 día se muestra "1d" + "21h".
 */
export function formatCountdown(ms: number): { main: string; sub: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const days = Math.floor(total / 86_400);
  if (days >= 1) return { main: `${days}d`, sub: `${Math.floor((total % 86_400) / 3600)}h` };
  return {
    main: `${pad2(Math.floor(total / 3600))}:${pad2(Math.floor((total % 3600) / 60))}`,
    sub: `${pad2(total % 60)}s`,
  };
}
