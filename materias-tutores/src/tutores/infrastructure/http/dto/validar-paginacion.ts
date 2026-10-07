import { BadRequestException } from '@nestjs/common';
import type { Paginacion } from '../../../application/models/paginacion.js';

function leerEnteroPositivo(valor: unknown, campo: string, valorPredeterminado: number): number {
  if (valor === undefined) return valorPredeterminado;
  if (typeof valor !== 'string' || !/^[0-9]+$/.test(valor)) {
    throw new BadRequestException(`${campo} debe ser un número entero positivo.`);
  }
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < 1) {
    throw new BadRequestException(`${campo} debe ser un número entero positivo seguro.`);
  }
  return numero;
}

export function validarPaginacion(page: unknown, limit: unknown): Paginacion {
  const pageNumber = leerEnteroPositivo(page, 'page', 1);
  const limitNumber = leerEnteroPositivo(limit, 'limit', 10);
  if (limitNumber > 100) {
    throw new BadRequestException('limit no puede ser mayor que 100.');
  }
  if (!Number.isSafeInteger((pageNumber - 1) * limitNumber)) {
    throw new BadRequestException('La página solicitada produce un desplazamiento fuera del rango seguro.');
  }
  return { page: pageNumber, limit: limitNumber };
}
