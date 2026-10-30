import type { AvisoSesion, ContenidoAvisoSesion } from '../aviso-sesion.js';

export const AVISO_SESION_REPOSITORY = Symbol('AVISO_SESION_REPOSITORY');

export interface DatosNuevoAvisoSesion {
  origen: string;
  version: number;
  idAviso: string;
  fechaAviso: Date;
  tipo: string;
  idSesion: bigint;
  datos: ContenidoAvisoSesion;
}

export interface ResultadoRegistroAviso {
  aviso: AvisoSesion;
  duplicado: boolean;
}

export interface AvisoSesionRepository {
  registrar(datos: DatosNuevoAvisoSesion): Promise<ResultadoRegistroAviso>;
}
