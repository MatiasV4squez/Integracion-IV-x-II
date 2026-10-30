import type { ContenidoConflictoSesion } from '../aviso-sesion.js';

export const CONFLICTO_SESION_CONSULTA_REPOSITORY = Symbol(
  'CONFLICTO_SESION_CONSULTA_REPOSITORY',
);

export interface ConflictoSesionPendiente {
  id_aviso: string;
  fecha_aviso: Date;
  id_sesion: bigint;
  contenido: ContenidoConflictoSesion;
}

export interface ConflictoSesionConsultaRepository {
  listarPendientes(): Promise<ConflictoSesionPendiente[]>;
}
