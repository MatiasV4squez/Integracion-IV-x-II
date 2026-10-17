import type { EstadoDisponibilidad } from '../tipos/estado-disponibilidad';

export interface DisponibilidadTutor {
  id_disponibilidad: bigint;
  id_tutor: bigint;
  inicio: Date; // UTC
  fin: Date; // UTC
  estado: EstadoDisponibilidad;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}
