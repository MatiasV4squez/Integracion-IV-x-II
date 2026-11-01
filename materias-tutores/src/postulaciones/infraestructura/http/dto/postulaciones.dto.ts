import { BadRequestException } from '@nestjs/common';
import { parsePositiveId } from '../../../../auth/parse-positive-id.js';

export interface ArchivoCertificado {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface RevisionPostulacion {
  notaAcreditada?: number;
  motivoRechazo?: string;
}

export function leerIdPositivo(texto: string, campo: string): bigint {
  const valor = parsePositiveId(texto);
  if (valor === null) {
    throw new BadRequestException(`${campo} debe ser un entero positivo`);
  }
  return valor;
}

export function validarRevision(
  cuerpo: unknown,
  decision: 'aprobar' | 'rechazar',
): RevisionPostulacion {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    throw new BadRequestException('El cuerpo debe ser un objeto JSON');
  }
  const datos = cuerpo as Record<string, unknown>;
  const permitidos =
    decision === 'aprobar' ? ['notaAcreditada'] : ['motivoRechazo'];
  if (Object.keys(datos).some((campo) => !permitidos.includes(campo))) {
    throw new BadRequestException('El cuerpo contiene campos no permitidos');
  }
  if (decision === 'aprobar') {
    const nota = datos.notaAcreditada;
    if (
      typeof nota !== 'number' ||
      !Number.isFinite(nota) ||
      nota < 1 ||
      nota > 7 ||
      Math.round(nota * 10) !== nota * 10
    ) {
      throw new BadRequestException(
        'notaAcreditada debe estar entre 1.0 y 7.0, con un decimal',
      );
    }
    return { notaAcreditada: nota };
  }
  const motivo = datos.motivoRechazo;
  if (
    typeof motivo !== 'string' ||
    motivo.trim().length < 3 ||
    motivo.trim().length > 500
  ) {
    throw new BadRequestException(
      'motivoRechazo debe contener entre 3 y 500 caracteres',
    );
  }
  return { motivoRechazo: motivo.trim() };
}
