import { BadRequestException, ConflictException } from '@nestjs/common';
import { parsePositiveId } from '../../../../auth/parse-positive-id.js';
import type { EventoCalificacion } from '../../../application/ports/reputacion.repository.js';

export function leerIdReputacion(texto: unknown, campo: string): bigint {
  const id = parsePositiveId(texto);
  if (id === null) throw new BadRequestException(`${campo} debe ser un entero positivo BIGINT en texto.`);
  return id;
}

export function validarEventoCalificacion(idTutor: unknown, cuerpo: unknown): EventoCalificacion {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    throw new BadRequestException('Cuerpo inválido.');
  }
  const datos = cuerpo as Record<string, unknown>;
  if (Object.keys(datos).length !== 3 || Object.keys(datos).some((campo) => !['idCalificacion', 'puntuacion', 'rolEvaluado'].includes(campo))) {
    throw new BadRequestException('Campos de calificación inválidos.');
  }
  if (datos.rolEvaluado !== 'TUTOR') {
    throw new ConflictException('Solo se contabilizan evaluaciones al tutor.');
  }
  if (typeof datos.puntuacion !== 'number' || !Number.isInteger(datos.puntuacion) || datos.puntuacion < 1 || datos.puntuacion > 5) {
    throw new BadRequestException('puntuacion debe ser un entero entre 1 y 5.');
  }
  return { idTutor: leerIdReputacion(idTutor, 'idTutor'), idCalificacion: leerIdReputacion(datos.idCalificacion, 'idCalificacion'), puntuacion: datos.puntuacion };
}
