import type { SesionesRepository } from '@/application/ports/repositories';
import type { ClosureResult, Session, SesionesFilter, SolicitudInput } from '@/domain/sesiones/session';
import { RATING } from '@/shared/app-config';

/** Resultado de una acción: nunca lanza, así la pantalla siempre tiene un mensaje. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

const run = async <T>(op: () => Promise<T>, fallback: string): Promise<ActionResult<T>> => {
  try {
    return { ok: true, data: await op() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : fallback };
  }
};

/** Filtra sesiones por rol y estado (el backend entrega todas las del usuario). */
export const filtrarSesiones = (sessions: Session[], { role, status }: SesionesFilter = {}) =>
  sessions.filter((s) => (!role || s.myRole === role) && (!status || s.status === status));

/** Casos de uso de las sesiones de tutoría con backend (agendamiento-sesiones y reportes). */
export function createSesionesUseCases(deps: { sesiones: SesionesRepository }) {
  return {
    listar: (signal?: AbortSignal) => deps.sesiones.listar(signal),
    solicitar: (input: SolicitudInput) => run(() => deps.sesiones.solicitar(input), 'No se pudo enviar la solicitud.'),
    responder: (id: string, accept: boolean) => run(() => deps.sesiones.responder(id, accept), 'No se pudo responder la solicitud.'),
    cancelar: (id: string) => run(() => deps.sesiones.cancelar(id), 'No se pudo cancelar la sesión.'),
    declarar: (session: Session, result: ClosureResult) => run(() => deps.sesiones.declarar(session, result), 'No se pudo registrar la declaración.'),
    calificar: (id: string, puntuacion: number): Promise<ActionResult> => {
      // BR19: entero de 1 a 5; se valida antes de llamar al servicio.
      if (!Number.isInteger(puntuacion) || puntuacion < RATING.MIN || puntuacion > RATING.MAX) {
        return Promise.resolve({ ok: false, error: `La calificación debe ser un entero de ${RATING.MIN} a ${RATING.MAX}.` });
      }
      return run(() => deps.sesiones.calificar(id, puntuacion), 'No se pudo registrar la calificación.');
    },
    reportar: (session: Session, reason: string, description: string): Promise<ActionResult> => {
      if (!reason.trim() || !description.trim()) return Promise.resolve({ ok: false, error: 'Indica el motivo y describe lo ocurrido.' });
      return run(() => deps.sesiones.reportar(session, reason.trim(), description.trim()), 'No se pudo enviar el reporte.');
    },
  };
}

export type SesionesUseCases = ReturnType<typeof createSesionesUseCases>;
