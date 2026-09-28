import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  type sesion,
  type sesion_estado_sesion_enum,
} from '../generated/prisma/client';

export const OCCUPYING_STATES: sesion_estado_sesion_enum[] = [
  'PENDIENTE',
  'CONFIRMADA',
  'PENDIENTE_CIERRE',
];

export function parseIdentifier(value: string, field: string): bigint {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,18}$/.test(value)) {
    throw new BadRequestException(
      `${field} debe ser un entero positivo enviado como texto.`,
    );
  }
  const id = BigInt(value);
  if (id > 9223372036854775807n) {
    throw new BadRequestException(`${field} supera el máximo permitido.`);
  }
  return id;
}

export function validateTutor(session: sesion, userId: bigint): void {
  if (session.id_tutor !== userId) {
    throw new ForbiddenException(
      'Solo el tutor asociado puede realizar esta acción.',
    );
  }
}

export function validateParticipant(session: sesion, userId: bigint): void {
  if (session.id_tutor !== userId && session.id_tutee !== userId) {
    throw new ForbiddenException(
      'Solo los participantes pueden cancelar la sesión.',
    );
  }
}

export function validateState(
  session: sesion,
  expected: sesion_estado_sesion_enum,
): void {
  if (session.estado_sesion !== expected) {
    throw new ConflictException(`La sesión debe estar en estado ${expected}.`);
  }
}

export function toSessionResponse(session: sesion) {
  return {
    id_sesion: session.id_sesion.toString(),
    id_tutee: session.id_tutee.toString(),
    id_tutor: session.id_tutor.toString(),
    id_materia: session.id_materia.toString(),
    id_bloque: session.id_bloque.toString(),
    estado_sesion: session.estado_sesion,
    inicio: session.inicio,
    fin: session.fin,
    fecha_creacion: session.fecha_creacion,
    fecha_actualizacion: session.fecha_actualizacion,
  };
}
