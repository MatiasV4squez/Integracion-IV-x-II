import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import { ErrorAceptarSolicitud } from '../models/error-sesiones'
import type { Sesion } from '../models/sesion'
import { esSesion } from '../utils/validar-sesion'

export async function aceptarSolicitud(idSesion: string, sesion: SesionUsuario, externa?: AbortSignal): Promise<Sesion> {
  externa?.throwIfAborted()
  if (!sesion.token || !esIdentificador(sesion.idUsuario) || sesion.expiraEn <= Date.now()) {
    throw new ErrorAceptarSolicitud('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 'sesion')
  }
  if (!sesion.roles.includes('TUTOR')) {
    throw new ErrorAceptarSolicitud('Necesitas una cuenta habilitada como tutor para aceptar solicitudes.', 'permiso')
  }
  if (!esIdentificador(idSesion)) throw new ErrorAceptarSolicitud('El identificador de la solicitud no es válido.', 'solicitud')

  const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi('agendamiento-sesiones/sessions/' + idSesion + '/accept'), {
      method: 'PATCH', headers: { Accept: 'application/json', Authorization: 'Bearer ' + sesion.token }, signal,
    })
    if (respuesta.status === 401) throw new ErrorAceptarSolicitud('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 'sesion')
    if (respuesta.status === 403) throw new ErrorAceptarSolicitud('No tienes permiso para aceptar esta solicitud.', 'permiso')
    if (respuesta.status === 404) throw new ErrorAceptarSolicitud('La solicitud ya no existe. Consulta el listado actualizado.', 'ausente')
    if (respuesta.status === 409) throw new ErrorAceptarSolicitud('No se pudo aceptar: la solicitud cambió de estado o el horario está ocupado. Consulta el listado actualizado.', 'conflicto')
    if (respuesta.status === 400) throw new ErrorAceptarSolicitud('No se pudo aceptar esta solicitud. Actualiza el listado antes de intentarlo nuevamente.', 'solicitud')
    if (!respuesta.ok) throw new ErrorAceptarSolicitud('No pudimos confirmar el resultado. Actualiza el listado antes de volver a aceptar.', 'incierto')

    const datos: unknown = await respuesta.json()
    if (!esSesion(datos) || datos.id_sesion !== idSesion || datos.id_tutor !== sesion.idUsuario || datos.estado_sesion !== 'CONFIRMADA') {
      throw new ErrorAceptarSolicitud('La respuesta no permite confirmar la aceptación. Actualiza el listado antes de volver a aceptar.', 'incierto')
    }
    // Se conserva exclusivamente el contrato público de la sesión.
    return {
      id_sesion: datos.id_sesion, id_tutee: datos.id_tutee, id_tutor: datos.id_tutor,
      id_materia: datos.id_materia, id_bloque: datos.id_bloque, estado_sesion: datos.estado_sesion,
      inicio: datos.inicio, fin: datos.fin, fecha_creacion: datos.fecha_creacion,
      fecha_actualizacion: datos.fecha_actualizacion, resultado_provisional: datos.resultado_provisional,
    }
  } catch (error) {
    if (externa?.aborted) throw error
    if (error instanceof ErrorAceptarSolicitud) throw error
    throw new ErrorAceptarSolicitud(signal.aborted
      ? 'Se agotó el tiempo de espera. La solicitud pudo haberse aceptado; actualiza el listado antes de volver a aceptar.'
      : 'No pudimos confirmar el resultado. Actualiza el listado antes de volver a aceptar.', 'incierto', { cause: error })
  }
}
