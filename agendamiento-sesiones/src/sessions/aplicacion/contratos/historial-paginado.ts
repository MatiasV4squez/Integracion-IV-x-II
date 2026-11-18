import type { Sesion } from '../../dominio/entidades/sesion';
import type { Calificacion } from '../../dominio/entidades/calificacion';
import type { EstadoSesion } from '../../dominio/tipos/estado-sesion';

export const ROLES_HISTORIAL = ['ESTUDIANTE', 'TUTOR'] as const;
export type RolHistorial = (typeof ROLES_HISTORIAL)[number];
export const LIMITE_HISTORIAL = 100;
export const PAGINA_MAXIMA_HISTORIAL = 1_000_000;

export interface EntradaHistorialPaginado {
  page?: string;
  limit?: string;
  rol?: RolHistorial;
  estado?: EstadoSesion;
}

export interface FiltrosHistorialPaginado {
  idUsuario: bigint;
  page: number;
  limit: number;
  rol?: RolHistorial;
  estado?: EstadoSesion;
}

export interface PaginaHistorial {
  items: Array<Sesion & { calificaciones: Calificacion[] }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
