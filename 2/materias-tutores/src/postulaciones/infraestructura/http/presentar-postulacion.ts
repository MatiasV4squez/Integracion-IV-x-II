import type { Postulacion } from '../../dominio/postulacion.js';
import type { PostulacionRespuestaDto } from './dto/postulacion-respuesta.dto.js';

export function presentarPostulacion(postulacion: Postulacion): PostulacionRespuestaDto {
  return {
    idPostulacion: postulacion.idPostulacion.toString(),
    idUsuario: postulacion.idUsuario.toString(),
    idMateria: postulacion.idMateria.toString(),
    idAdministradorRevision: postulacion.idAdministradorRevision?.toString() ?? null,
    certificadoNombre: postulacion.certificadoNombre,
    certificadoTipo: postulacion.certificadoTipo,
    notaAcreditada: postulacion.notaAcreditada,
    estado: postulacion.estado,
    fechaPostulacion: postulacion.fechaPostulacion,
    fechaRevision: postulacion.fechaRevision,
    motivoRechazo: postulacion.motivoRechazo,
  };
}
