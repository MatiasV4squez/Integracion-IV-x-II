import type { ResultadoCierre } from '../tipos/estado-sesion';

export interface DeclaracionCierre {
  id_declaracion: bigint;
  id_sesion: bigint;
  id_usuario: bigint;
  resultado_declarado: ResultadoCierre;
  id_usuario_inasistente: bigint | null;
  fecha_declaracion: Date;
}
