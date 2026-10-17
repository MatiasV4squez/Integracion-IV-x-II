import type { DisponibilidadTutor } from '../../dominio/entidades/disponibilidad-tutor';
import {
  obtenerDia,
  obtenerHora,
} from '../../dominio/reglas/reglas-disponibilidad';

export function aRespuestaDisponibilidad(disponibilidad: DisponibilidadTutor) {
  return {
    id_disponibilidad: disponibilidad.id_disponibilidad.toString(),
    id_tutor: disponibilidad.id_tutor.toString(),
    dia: obtenerDia(disponibilidad.inicio),
    hora_inicio: obtenerHora(disponibilidad.inicio),
    hora_fin: obtenerHora(disponibilidad.fin),
    inicio: disponibilidad.inicio,
    fin: disponibilidad.fin,
    estado: disponibilidad.estado,
    fecha_creacion: disponibilidad.fecha_creacion,
    fecha_actualizacion: disponibilidad.fecha_actualizacion,
  };
}
