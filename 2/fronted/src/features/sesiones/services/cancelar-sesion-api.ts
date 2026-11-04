import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import { ErrorCancelarSesion } from '../models/error-sesiones'
import { esSesion } from '../utils/validar-sesion'

export async function cancelarSesion(idSesion: string, sesion: SesionUsuario, externa?: AbortSignal): Promise<void> {
  externa?.throwIfAborted()
  if (!sesion.token || !esIdentificador(sesion.idUsuario) || sesion.expiraEn <= Date.now()) {
    throw new ErrorCancelarSesion('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 'sesion')
  }
  if (!sesion.roles.includes('ESTUDIANTE')) {
    throw new ErrorCancelarSesion('Necesitas una cuenta de estudiante para cancelar sesiones.', 'permiso')
  }
  if (!esIdentificador(idSesion)) throw new ErrorCancelarSesion('El identificador de la sesión no es válido.', 'solicitud')

  const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi('agendamiento-sesiones/sessions/' + idSesion + '/cancel'), {
      method: 'PATCH', headers: { Accept: 'application/json', Authorization: 'Bearer ' + sesion.token }, signal,
    })
    if (respuesta.status === 401) throw new ErrorCancelarSesion('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 'sesion')
    if (respuesta.status === 403) throw new ErrorCancelarSesion('No tienes permiso para cancelar esta sesión.', 'permiso')
    if (respuesta.status === 404) throw new ErrorCancelarSesion('La sesión ya no existe. Actualiza el listado.', 'ausente')
    if (respuesta.status === 409) throw new ErrorCancelarSesion('No se pudo cancelar: la sesión cambió de estado o ya comenzó. Actualiza el listado.', 'conflicto')
    if (respuesta.status === 400) throw new ErrorCancelarSesion('No se pudo cancelar esta sesión. Actualiza el listado antes de intentarlo nuevamente.', 'solicitud')
    if (!respuesta.ok) throw new ErrorCancelarSesion('No pudimos confirmar la cancelación. Actualiza el listado antes de volver a intentarlo.', 'incierto')

    const datos: unknown = await respuesta.json()
    if (!esSesion(datos) || datos.id_sesion !== idSesion || datos.id_tutee !== sesion.idUsuario || datos.estado_sesion !== 'CANCELADA') {
      throw new ErrorCancelarSesion('La respuesta no permite confirmar la cancelación. Actualiza el listado antes de volver a intentarlo.', 'incierto')
    }
  } catch (error) {
    if (externa?.aborted) throw error
    if (error instanceof ErrorCancelarSesion) throw error
    throw new ErrorCancelarSesion(signal.aborted
      ? 'Se agotó el tiempo de espera. La sesión pudo haberse cancelado; actualiza el listado antes de volver a intentarlo.'
      : 'No pudimos confirmar la cancelación. Actualiza el listado antes de volver a intentarlo.', 'incierto', { cause: error })
  }
}
