import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import type { Sesion } from '../models/sesion'
import { seleccionarSolicitudesRecibidas } from '../utils/solicitudes-recibidas'
import { esSesion } from '../utils/validar-sesion'
import { ErrorConsultaSesiones } from '../models/error-sesiones'

export { ErrorConsultaSesiones } from '../models/error-sesiones'

type RecursoSesiones = 'solicitudes' | 'sesiones'

function exigirAcceso(sesion: SesionUsuario, rol: string, mensajePermiso: string) {
  if (!sesion.token || !esIdentificador(sesion.idUsuario) || sesion.expiraEn <= Date.now()) {
    throw new ErrorConsultaSesiones('Tu sesión no es válida o ha vencido. Inicia sesión nuevamente.', 'sesion')
  }
  if (!sesion.roles.includes(rol)) throw new ErrorConsultaSesiones(mensajePermiso, 'permiso')
}

async function consultarSesiones(sesion: SesionUsuario, externa: AbortSignal | undefined, recurso: RecursoSesiones, ruta: 'history' | 'active'): Promise<Sesion[]> {
  const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi(`agendamiento-sesiones/sessions/${ruta}`), {
      signal, headers: { Accept: 'application/json', Authorization: 'Bearer ' + sesion.token },
    })
    if (respuesta.status === 401) throw new ErrorConsultaSesiones('Tu sesión no es válida o ha vencido. Inicia sesión nuevamente.', 'sesion')
    if (respuesta.status === 403) throw new ErrorConsultaSesiones(`No tienes permiso para consultar estas ${recurso}.`, 'permiso')
    if (!respuesta.ok) throw new ErrorConsultaSesiones(respuesta.status === 504
      ? 'La consulta tardó demasiado. Inténtalo de nuevo.' : `No pudimos cargar las ${recurso}. Inténtalo de nuevo.`)

    let datos: unknown
    try { datos = await respuesta.json() }
    catch (error) {
      if (signal.aborted) throw error
      throw new ErrorConsultaSesiones(`No pudimos leer las ${recurso}. Inténtalo de nuevo.`, 'consulta', { cause: error })
    }
    if (!Array.isArray(datos) || !datos.every(esSesion)
      || new Set(datos.map((item) => item.id_sesion)).size !== datos.length) {
      throw new ErrorConsultaSesiones(`No pudimos leer las ${recurso}. Inténtalo de nuevo.`)
    }
    return datos.map((item) => ({
      id_sesion: item.id_sesion, id_tutor: item.id_tutor, id_tutee: item.id_tutee,
      id_materia: item.id_materia, id_bloque: item.id_bloque, estado_sesion: item.estado_sesion,
      inicio: item.inicio, fin: item.fin, fecha_creacion: item.fecha_creacion,
      fecha_actualizacion: item.fecha_actualizacion, resultado_provisional: item.resultado_provisional,
    }))
  } catch (error) {
    if (externa?.aborted) throw error
    if (error instanceof ErrorConsultaSesiones) throw error
    throw new ErrorConsultaSesiones(signal.aborted ? 'La consulta tardó demasiado. Inténtalo de nuevo.'
      : `No pudimos conectar para consultar las ${recurso}. Inténtalo de nuevo.`, 'consulta', { cause: error })
  }
}

export async function consultarSolicitudesRecibidas(sesion: SesionUsuario, externa?: AbortSignal): Promise<Sesion[]> {
  externa?.throwIfAborted()
  exigirAcceso(sesion, 'TUTOR', 'Esta sección está disponible para tutores.')
  const historial = await consultarSesiones(sesion, externa, 'solicitudes', 'history')
  return seleccionarSolicitudesRecibidas(historial, sesion.idUsuario)
}

export async function consultarSesionesActivas(sesion: SesionUsuario, externa?: AbortSignal): Promise<Sesion[]> {
  externa?.throwIfAborted()
  exigirAcceso(sesion, 'ESTUDIANTE', 'Esta sección está disponible para estudiantes.')
  return consultarSesiones(sesion, externa, 'sesiones', 'active')
}

export async function consultarHistorialEstudiante(
  sesion: SesionUsuario,
  externa?: AbortSignal,
): Promise<Sesion[]> {
  externa?.throwIfAborted()

  exigirAcceso(
    sesion,
    'ESTUDIANTE',
    'Esta seccion está disponible para estudiantes',
  )
  const historial = await consultarSesiones(sesion, externa, 'sesiones', 'history')
  return historial.filter(
    (clase) => clase.id_tutee === sesion.idUsuario,
  )
}
