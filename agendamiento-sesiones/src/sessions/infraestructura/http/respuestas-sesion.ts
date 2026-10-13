import type { Sesion } from '../../dominio/entidades/sesion';
import type { DeclaracionCierre } from '../../dominio/entidades/declaracion-cierre';
import type { Calificacion } from '../../dominio/entidades/calificacion';

export function aRespuestaSesion(session: Sesion) {
  return {
    id_sesion: session.id_sesion.toString(),
    id_tutee: session.id_tutee.toString(),
    id_tutor: session.id_tutor.toString(),
    id_materia: session.id_materia.toString(),
    id_bloque: session.id_bloque.toString(),
    estado_sesion: session.estado_sesion,
    inicio: session.inicio,
    fin: session.fin,
    fecha_creacion: session.fecha_creacion,
    fecha_actualizacion: session.fecha_actualizacion,
    resultado_provisional: session.resultado_provisional,
  };
}

export function aRespuestaDeclaracion(declaration: DeclaracionCierre) {
  return {
    id_declaracion: declaration.id_declaracion.toString(),
    id_sesion: declaration.id_sesion.toString(),
    id_usuario: declaration.id_usuario.toString(),
    resultado_declarado: declaration.resultado_declarado,
    id_usuario_inasistente:
      declaration.id_usuario_inasistente?.toString() ?? null,
    fecha_declaracion: declaration.fecha_declaracion,
  };
}

export function aRespuestaCalificacion(calificacionRegistrada: Calificacion) {
  return {
    id_calificacion: calificacionRegistrada.id_calificacion.toString(),
    id_sesion: calificacionRegistrada.id_sesion.toString(),
    id_evaluador: calificacionRegistrada.id_evaluador.toString(),
    id_evaluado: calificacionRegistrada.id_evaluado.toString(),
    puntuacion: calificacionRegistrada.puntuacion,
    fecha_calificacion: calificacionRegistrada.fecha_calificacion,
  };
}
