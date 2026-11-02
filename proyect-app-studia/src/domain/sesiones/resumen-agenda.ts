import type { AvailabilityBlock, Session, UserRole } from '@/domain/sesiones/session';

const ACTIVE_STATUSES = ['pendiente', 'confirmada', 'pendiente_cierre', 'en_conflicto'];
const byStart = (a: Session, b: Session) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

/** Próxima clase del estudiante: la confirmada más cercana que aún no termina. */
export function proximaClase(sessions: Session[], nowIso: string): Session | null {
  const now = new Date(nowIso).getTime();
  return (
    sessions
      .filter((s) => s.myRole === 'tutee' && s.status === 'confirmada' && new Date(s.endsAt).getTime() > now)
      .sort(byStart)[0] ?? null
  );
}

/** Clases del estudiante en curso (pendientes, confirmadas o por cerrar), de la más próxima a la más lejana. */
export function clasesActivas(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.myRole === 'tutee' && ACTIVE_STATUSES.includes(s.status)).sort(byStart);
}

export type ResumenTutor = {
  /** Solicitudes pendientes que el tutor debe aceptar o rechazar, de la más próxima a la más lejana. */
  solicitudes: Session[];
  proxima: Session | null;
  bloquesDisponibles: number;
  completadas: number;
};

/** Próximas sesiones confirmadas o por cerrar del tutor (de la más cercana a la más lejana). */
export function sesionesAgendadasTutor(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.myRole === 'tutor' && ['confirmada', 'pendiente_cierre', 'en_conflicto'].includes(s.status)).sort(byStart);
}

/** Indicadores del inicio del tutor. */
export function resumenTutor(sessions: Session[], blocks: AvailabilityBlock[], nowIso: string): ResumenTutor {
  const now = new Date(nowIso).getTime();
  const comoTutor = sessions.filter((s) => s.myRole === 'tutor');
  return {
    solicitudes: comoTutor.filter((s) => s.status === 'pendiente').sort(byStart),
    proxima: comoTutor.filter((s) => s.status === 'confirmada' && new Date(s.endsAt).getTime() > now).sort(byStart)[0] ?? null,
    bloquesDisponibles: blocks.filter((b) => b.enrolled < b.capacity && new Date(b.startsAt).getTime() > now).length,
    completadas: comoTutor.filter((s) => s.status === 'completada').length,
  };
}

const FINAL_STATUSES = ['completada', 'no_realizada', 'inasistencia', 'cancelada', 'rechazada', 'expirada'];

export type ResumenEstudiante = { pendientes: number; confirmadas: number; completadas: number };

/** Conteos del inicio del estudiante (solo sesiones donde es el tutee). */
export function resumenEstudiante(sessions: Session[]): ResumenEstudiante {
  const mias = sessions.filter((s) => s.myRole === 'tutee');
  return {
    pendientes: mias.filter((s) => s.status === 'pendiente').length,
    confirmadas: mias.filter((s) => s.status === 'confirmada').length,
    completadas: mias.filter((s) => s.status === 'completada').length,
  };
}

/** Últimas tutorías terminadas en el rol pedido (de la más reciente a la más antigua). */
export function historialReciente(sessions: Session[], limit = 3, role: UserRole = 'tutee'): Session[] {
  return sessions
    .filter((s) => s.myRole === role && FINAL_STATUSES.includes(s.status))
    .sort((a, b) => byStart(b, a))
    .slice(0, limit);
}

export type FiltroHistorial = 'todas' | 'en_curso' | 'completadas' | 'otras';

const ENCAJA: Record<FiltroHistorial, (s: Session) => boolean> = {
  todas: () => true,
  en_curso: (s) => ACTIVE_STATUSES.includes(s.status),
  completadas: (s) => s.status === 'completada',
  otras: (s) => FINAL_STATUSES.includes(s.status) && s.status !== 'completada',
};

/** Historial de tutorías en el rol pedido (estudiante o tutor), de la más reciente a la más antigua. */
export function historialPorRol(sessions: Session[], role: UserRole, filtro: FiltroHistorial): Session[] {
  return sessions.filter((s) => s.myRole === role && ENCAJA[filtro](s)).sort((a, b) => byStart(b, a));
}

/** Cuántas tutorías del rol pedido hay en cada filtro (para los contadores). */
export function conteoHistorial(sessions: Session[], role: UserRole): Record<FiltroHistorial, number> {
  const mias = sessions.filter((s) => s.myRole === role);
  return {
    todas: mias.length,
    en_curso: mias.filter(ENCAJA.en_curso).length,
    completadas: mias.filter(ENCAJA.completadas).length,
    otras: mias.filter(ENCAJA.otras).length,
  };
}
