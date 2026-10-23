import { parsearIdEntidad } from '../dominio/identificadores.js';
import { payloadInvalido } from './errores.js';

export function requerirIdEntidad(value: unknown, field: string): bigint {
  const id = parsearIdEntidad(value);
  if (id === undefined) {
    throw payloadInvalido(`${field} debe ser un identificador válido.`);
  }
  return id;
}

export function requerirIdReporte(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw payloadInvalido('id debe ser un entero positivo.');
  }
  return value;
}
