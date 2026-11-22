import type { ResultadoCierre } from '../../dominio/tipos/estado-sesion';

export interface EntradaCrearSesion {
  id_tutor: string;
  id_materia: string;
  id_bloque: string;
}

export interface NuevaSesion {
  id_tutor: bigint;
  id_tutee: bigint;
  id_materia: bigint;
  id_bloque: bigint;
  inicio: Date;
  fin: Date;
}

export interface EntradaDeclararCierre {
  resultado_declarado: ResultadoCierre;
  id_usuario_inasistente?: string;
}

export interface EntradaResolverConflicto {
  nuevo_estado: ResultadoCierre;
  motivo_resolucion: string;
  observaciones?: string;
}

export interface EntradaCalificarSesion {
  puntuacion: number;
}
