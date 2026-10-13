import type { EstadoSesion } from '../tipos/estado-sesion';

export interface Sesion {
  id_sesion: bigint;
  id_tutee: bigint;
  id_tutor: bigint;
  id_materia: bigint;
  id_bloque: bigint;
  estado_sesion: EstadoSesion;
  inicio: Date;
  fin: Date;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  resultado_provisional: boolean;
}
