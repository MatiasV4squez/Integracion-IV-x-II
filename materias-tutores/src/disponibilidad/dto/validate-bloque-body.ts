import { BadRequestException } from '@nestjs/common';
import type { ActualizarBloqueDisponibilidadDto } from './actualizar-bloque-disponibilidad.dto.js';
import type { CrearBloqueDisponibilidadDto } from './crear-bloque-disponibilidad.dto.js';

const CAMPOS = ['dia', 'horaInicio', 'horaFin'];

function leerCuerpo(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('El cuerpo debe ser un objeto JSON');
  }

  const valores = body as Record<string, unknown>;
  if (Object.keys(valores).some((campo) => !CAMPOS.includes(campo))) {
    throw new BadRequestException('El cuerpo contiene campos no permitidos');
  }
  return valores;
}

function leerTexto(valores: Record<string, unknown>, campo: string): string {
  if (typeof valores[campo] !== 'string') {
    throw new BadRequestException(`${campo} debe ser un texto`);
  }
  return valores[campo];
}

export function validarCrearBloque(
  body: unknown,
): CrearBloqueDisponibilidadDto {
  const valores = leerCuerpo(body);
  return {
    dia: leerTexto(valores, 'dia'),
    horaInicio: leerTexto(valores, 'horaInicio'),
    horaFin: leerTexto(valores, 'horaFin'),
  };
}

export function validarActualizarBloque(
  body: unknown,
): ActualizarBloqueDisponibilidadDto {
  const valores = leerCuerpo(body);
  if (Object.keys(valores).length === 0) {
    throw new BadRequestException('Indica al menos un campo para actualizar');
  }

  const dto: ActualizarBloqueDisponibilidadDto = {};
  if ('dia' in valores) dto.dia = leerTexto(valores, 'dia');
  if ('horaInicio' in valores) {
    dto.horaInicio = leerTexto(valores, 'horaInicio');
  }
  if ('horaFin' in valores) dto.horaFin = leerTexto(valores, 'horaFin');
  return dto;
}
