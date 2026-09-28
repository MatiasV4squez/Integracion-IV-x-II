/**
 * Lógica pura (sin React) de las reglas de negocio de sesiones del SRS.
 * Se mantiene aparte de la UI para poder probarla con `npm test`.
 */
import type { SessionStatus, UserRole } from '../types/session';

/** BR05: máximo de solicitudes pendientes por Tutee. */
export const MAX_PENDING_REQUESTS = 4;
/** BR03: horas antes de que una solicitud pendiente expire. */
export const REQUEST_EXPIRY_HOURS = 24;
/** BR18: horas para aceptar provisionalmente la declaración de cierre. */
export const CLOSURE_TIMEOUT_HOURS = 48;

/** BR02: transiciones permitidas. Los estados finales no tienen salida. */
export const TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  pendiente: ['confirmada', 'rechazada', 'expirada'],
  confirmada: ['cancelada', 'pendiente_cierre'],
  pendiente_cierre: ['completada', 'no_realizada', 'inasistencia', 'en_conflicto'],
  en_conflicto: ['completada', 'no_realizada', 'inasistencia'], // solo Administrador
  rechazada: [],
  expirada: [],
  cancelada: [],
  completada: [],
  no_realizada: [],
  inasistencia: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: SessionStatus, to: SessionStatus) {
    super(`Transición no permitida: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Devuelve el nuevo estado o lanza si la transición viola BR02 (CA07). */
export function transition(from: SessionStatus, to: SessionStatus): SessionStatus {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
  return to;
}

export function isFinal(status: SessionStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** BR10: solo se puede reportar si la sesión alguna vez llegó a "Confirmada". */
export function hasReachedConfirmed(status: SessionStatus): boolean {
  return status !== 'pendiente' && status !== 'rechazada' && status !== 'expirada';
}

/** BR05 / RF11: un Tutee no puede tener más de 4 solicitudes pendientes. */
export function canCreateRequest(pendingCount: number): boolean {
  return pendingCount < MAX_PENDING_REQUESTS;
}

/** BR03: fecha límite de respuesta del Tutor para una solicitud pendiente. */
export function requestExpiresAt(createdAtIso: string): string {
  const ms = new Date(createdAtIso).getTime() + REQUEST_EXPIRY_HOURS * 3_600_000;
  return new Date(ms).toISOString();
}

/** BR15: una sesión confirmada solo se cancela antes de su hora de inicio. */
export function canCancel(status: SessionStatus, startsAtIso: string, nowIso: string): boolean {
  return status === 'confirmada' && new Date(nowIso).getTime() < new Date(startsAtIso).getTime();
}

export type SessionAction =
  | 'aceptar'
  | 'rechazar'
  | 'cancelar'
  | 'declarar_resultado'
  | 'calificar'
  | 'reportar';

type ActionContext = {
  status: SessionStatus;
  role: UserRole;
  startsAt: string;
  now: string;
  /** El usuario actual ya calificó esta sesión (BR04). */
  alreadyRated: boolean;
};

/** Acciones que la UI debe ofrecer al usuario según estado, rol y reglas de negocio. */
export function getAvailableActions(ctx: ActionContext): SessionAction[] {
  const actions: SessionAction[] = [];

  switch (ctx.status) {
    case 'pendiente':
      // BR14: solo el Tutor solicitado acepta o rechaza.
      if (ctx.role === 'tutor') actions.push('aceptar', 'rechazar');
      break;
    case 'confirmada':
      if (canCancel(ctx.status, ctx.startsAt, ctx.now)) actions.push('cancelar');
      break;
    case 'pendiente_cierre':
      actions.push('declarar_resultado');
      break;
    case 'completada':
      // BR04: una sola calificación por participante.
      if (!ctx.alreadyRated) actions.push('calificar');
      break;
    default:
      break;
  }

  if (hasReachedConfirmed(ctx.status)) actions.push('reportar');
  return actions;
}
