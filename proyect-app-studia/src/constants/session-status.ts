import type { Tone } from '@/constants/tones';
import type { SessionStatus } from '@/types/session';

export const STATUS_META: Record<SessionStatus, { label: string; tone: Tone }> = {
  pendiente: { label: 'Pendiente', tone: 'warning' },
  confirmada: { label: 'Confirmada', tone: 'info' },
  pendiente_cierre: { label: 'Pendiente de cierre', tone: 'alert' },
  en_conflicto: { label: 'En conflicto', tone: 'danger' },
  completada: { label: 'Completada', tone: 'success' },
  rechazada: { label: 'Rechazada', tone: 'danger' },
  expirada: { label: 'Expirada', tone: 'neutral' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
  no_realizada: { label: 'No realizada', tone: 'neutral' },
  inasistencia: { label: 'Inasistencia', tone: 'warning' },
};
