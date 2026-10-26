import type { Session, SessionStatus, UserRole } from '@/types/session';

import { api } from './client';

export type SesionesFilter = { role?: UserRole; status?: SessionStatus };

/**
 * GET /sesiones?rol=&estado= — sesiones del usuario actual. Solo modo API: sin backend las
 * sesiones viven en SessionsProvider (ahí se aplican las reglas de session-machine).
 */
export function fetchSesiones(filter: SesionesFilter, signal?: AbortSignal) {
  return api.get<Session[]>('/sesiones', { rol: filter.role, estado: filter.status }, signal);
}

/** GET /sesiones/:id. Solo modo API. */
export function fetchSesion(id: string, signal?: AbortSignal) {
  return api.get<Session>(`/sesiones/${encodeURIComponent(id)}`, undefined, signal);
}
