import type { Sesion } from '../entidades/sesion';
import type { EstadoSesion } from '../tipos/estado-sesion';
import { ErrorSesion } from '../errores/error-sesion';

export const ESTADOS_OCUPADOS: EstadoSesion[] = [
  'PENDIENTE',
  'CONFIRMADA',
  'PENDIENTE_CIERRE',
];

export const TRANSICIONES: Record<EstadoSesion, readonly EstadoSesion[]> = {
  PENDIENTE: ['CONFIRMADA', 'RECHAZADA', 'EXPIRADA'],
  CONFIRMADA: ['PENDIENTE_CIERRE', 'CANCELADA'],
  PENDIENTE_CIERRE: [
    'COMPLETADA',
    'NO_REALIZADA',
    'INASISTENCIA',
    'EN_CONFLICTO',
  ],
  EN_CONFLICTO: ['COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA'],
  RECHAZADA: [],
  EXPIRADA: [],
  CANCELADA: [],
  COMPLETADA: [],
  NO_REALIZADA: [],
  INASISTENCIA: [],
};

export function validarTransicion(
  current: EstadoSesion,
  next: EstadoSesion,
): void {
  if (!TRANSICIONES[current].includes(next)) {
    throw new ErrorSesion(
      'CONFLICTO',
      `No se puede cambiar el estado de ${current} a ${next}.`,
    );
  }
}

export function interpretarIdentificador(value: string, field: string): bigint {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,18}$/.test(value)) {
    throw new ErrorSesion(
      'ENTRADA_INVALIDA',
      `${field} debe ser un entero positivo enviado como texto.`,
    );
  }
  const id = BigInt(value);
  if (id > 9223372036854775807n) {
    throw new ErrorSesion(
      'ENTRADA_INVALIDA',
      `${field} supera el máximo permitido.`,
    );
  }
  return id;
}

export function validarTutor(session: Sesion, userId: bigint): void {
  if (session.id_tutor !== userId) {
    throw new ErrorSesion(
      'PROHIBIDO',
      'Solo el tutor asociado puede realizar esta acción.',
    );
  }
}

export function validarParticipante(session: Sesion, userId: bigint): void {
  if (session.id_tutor !== userId && session.id_tutee !== userId) {
    throw new ErrorSesion(
      'PROHIBIDO',
      'Solo los participantes pueden realizar esta acción.',
    );
  }
}

export function validarEstado(session: Sesion, expected: EstadoSesion): void {
  if (session.estado_sesion !== expected) {
    throw new ErrorSesion(
      'CONFLICTO',
      `La sesión debe estar en estado ${expected}.`,
    );
  }
}
