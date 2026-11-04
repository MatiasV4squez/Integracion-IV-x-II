import type { EstadoBloqueIntegracion } from '../../dominio/estado-bloque.js';

export const BLOQUES_INTEGRACION_REPOSITORY = Symbol('BLOQUES_INTEGRACION_REPOSITORY');

export interface BloquesIntegracionRepository {
  buscarEstado(idBloque: bigint): Promise<string | null>;
  cambiarSiEstado(idBloque: bigint, anterior: EstadoBloqueIntegracion, estado: EstadoBloqueIntegracion): Promise<boolean>;
}
