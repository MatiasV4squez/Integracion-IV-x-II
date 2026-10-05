import { BadRequestException } from '@nestjs/common';
import { parsePositiveId } from '../auth/parse-positive-id.js';

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

export function validarCertificado(
  archivo: ArchivoCertificado | undefined,
): 'application/pdf' | 'image/png' {
  if (
    !archivo ||
    !Buffer.isBuffer(archivo.buffer) ||
    archivo.size < 1 ||
    archivo.size > 5_000_000
  ) {
    throw new BadRequestException('Adjunta un certificado de hasta 5 MB');
  }
  const nombre = archivo.originalname.toLowerCase();
  const pdf =
    nombre.endsWith('.pdf') &&
    archivo.mimetype === 'application/pdf' &&
    archivo.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  const png =
    nombre.endsWith('.png') &&
    archivo.mimetype === 'image/png' &&
    archivo.buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!pdf && !png) {
    throw new BadRequestException('El certificado debe ser PDF o PNG válido');
  }
  if (archivo.originalname.length > 255) {
    throw new BadRequestException(
      'El nombre del certificado es demasiado largo',
    );
  }
  return pdf ? 'application/pdf' : 'image/png';
}
