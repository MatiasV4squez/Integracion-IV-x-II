import type { ResultadoCierre } from '../../dominio/tipos/estado-sesion';
import type { ResolucionConflicto } from '../../dominio/entidades/resolucion-conflicto';

export interface RepositorioResoluciones {
  registrar(resolucion: {
    id_sesion: bigint;
    id_administrador: bigint;
    estado_final: ResultadoCierre;
    motivo_resolucion: string;
    observaciones: string | null;
  }): Promise<ResolucionConflicto>;
}
