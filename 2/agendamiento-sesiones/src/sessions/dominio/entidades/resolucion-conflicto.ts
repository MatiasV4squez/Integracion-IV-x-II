import type { ResultadoCierre } from '../tipos/estado-sesion';

export interface ResolucionConflicto {
  id_resolucion: bigint;
  id_sesion: bigint;
  id_administrador: bigint;
  estado_final: ResultadoCierre;
  motivo_resolucion: string;
  observaciones: string | null;
  fecha_resolucion: Date;
}
