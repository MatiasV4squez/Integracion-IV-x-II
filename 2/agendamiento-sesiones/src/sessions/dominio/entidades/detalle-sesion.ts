import type { Sesion } from './sesion';
import type { DeclaracionCierre } from './declaracion-cierre';
import type { Calificacion } from './calificacion';

export interface DetalleSesion extends Sesion {
  modalidad: 'PRESENCIAL' | 'EN_LINEA' | null;
  lugar: string | null;
  enlace: string | null;
  declaraciones: DeclaracionCierre[];
  calificaciones: Calificacion[];
}

export interface AccionesSesion {
  aceptar: boolean;
  rechazar: boolean;
  cancelar: boolean;
  declarar_cierre: boolean;
  calificar: boolean;
  resolver_conflicto: boolean;
}
