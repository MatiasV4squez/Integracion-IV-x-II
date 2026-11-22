import type { AccionesSesion, DetalleSesion } from '../entidades/detalle-sesion';

export function obtenerAccionesSesion(
  sesion: DetalleSesion,
  usuario: bigint,
  esAdministrador: boolean,
  ahora: Date,
): AccionesSesion {
  const esTutor = sesion.id_tutor === usuario;
  const esEstudiante = sesion.id_tutee === usuario;
  const esParticipante = esTutor || esEstudiante;
  const pendiente = sesion.estado_sesion === 'PENDIENTE';

  return {
    aceptar: esTutor && pendiente,
    rechazar: esTutor && pendiente,
    cancelar:
      (esEstudiante && pendiente) ||
      (esParticipante && sesion.estado_sesion === 'CONFIRMADA' && ahora < sesion.inicio),
    declarar_cierre:
      esParticipante && sesion.estado_sesion === 'PENDIENTE_CIERRE' &&
      !sesion.declaraciones.some((declaracion) => declaracion.id_usuario === usuario),
    calificar:
      esParticipante && sesion.id_tutor !== sesion.id_tutee &&
      sesion.estado_sesion === 'COMPLETADA' &&
      !sesion.calificaciones.some((calificacion) => calificacion.id_evaluador === usuario),
    resolver_conflicto: esAdministrador && sesion.estado_sesion === 'EN_CONFLICTO',
  };
}
