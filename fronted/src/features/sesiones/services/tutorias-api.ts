import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { tieneRol } from '../../../shared/auth/acceso-rutas'
import { esIdentificador } from '../../../shared/utils/identificadores'
import { ErrorConsultaTutorias, type DetalleTutoria, type FiltrosTutorias, type PaginaTutorias, type Tutoria } from '../models/tutoria'
import { parametrosTutorias } from '../utils/filtros-tutorias'
import { copiarTutoria, esDetalleTutoria, esTutoria } from '../utils/validar-tutoria'
import { ESTADOS_SESION } from '../models/sesion'

function exigirSesion(sesion: SesionUsuario) {
  if (!sesion.token || !esIdentificador(sesion.idUsuario) || sesion.expiraEn <= Date.now()) {
    throw new ErrorConsultaTutorias('Tu sesión venció. Inicia sesión nuevamente.', 'sesion')
  }
}

async function consultar(ruta: string, sesion: SesionUsuario, externa?: AbortSignal): Promise<unknown> {
  externa?.throwIfAborted()
  exigirSesion(sesion)
  const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi('agendamiento-sesiones/sessions/' + ruta), {
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + sesion.token }, cache: 'no-store', signal,
    })
    if (respuesta.status === 401) throw new ErrorConsultaTutorias('Tu sesión venció. Inicia sesión nuevamente.', 'sesion')
    if (respuesta.status === 403) throw new ErrorConsultaTutorias('No tienes permiso para consultar estas tutorías.', 'permiso')
    if (respuesta.status === 404 && !ruta.startsWith('history/')) throw new ErrorConsultaTutorias('La tutoría no existe o ya no está disponible.', 'ausente')
    if (!respuesta.ok) throw new ErrorConsultaTutorias('No pudimos consultar tus tutorías. Inténtalo nuevamente.')
    return await respuesta.json()
  } catch (error) {
    if (externa?.aborted) throw error
    if (error instanceof ErrorConsultaTutorias) throw error
    throw new ErrorConsultaTutorias(signal.aborted ? 'La consulta tardó demasiado. Inténtalo nuevamente.'
      : 'No pudimos conectar para consultar tus tutorías. Inténtalo nuevamente.', 'consulta', { cause: error })
  }
}

export async function consultarHistorialPaginado(sesion: SesionUsuario, filtros: FiltrosTutorias, externa?: AbortSignal): Promise<PaginaTutorias> {
  if (!Number.isSafeInteger(filtros.page) || filtros.page < 1 || filtros.page > 1000000
    || ![10, 20, 50].includes(filtros.limit) || !['', 'ESTUDIANTE', 'TUTOR'].includes(filtros.rol)
    || filtros.estado !== '' && !ESTADOS_SESION.some((estado) => estado === filtros.estado)) {
    throw new ErrorConsultaTutorias('Revisa los filtros de búsqueda.')
  }
  const datos = await consultar('history/paginated?' + parametrosTutorias(filtros), sesion, externa)
  if (!datos || typeof datos !== 'object') throw new ErrorConsultaTutorias('No pudimos leer el historial de tutorías.')
  const pagina = datos as PaginaTutorias
  if (!Number.isSafeInteger(pagina.total) || pagina.total < 0 || pagina.page !== filtros.page
    || pagina.limit !== filtros.limit || pagina.totalPages !== Math.ceil(pagina.total / filtros.limit)
    || !Array.isArray(pagina.items) || !pagina.items.every(esTutoria)
    || pagina.items.length !== Math.min(filtros.limit, Math.max(0, pagina.total - (filtros.page - 1) * filtros.limit))
    || new Set(pagina.items.map((item) => item.id_sesion)).size !== pagina.items.length
    || !pagina.items.every((item) => (item.id_tutee === sesion.idUsuario || item.id_tutor === sesion.idUsuario)
      && (!filtros.rol || item[filtros.rol === 'TUTOR' ? 'id_tutor' : 'id_tutee'] === sesion.idUsuario)
      && (!filtros.estado || item.estado_sesion === filtros.estado))) {
    throw new ErrorConsultaTutorias('No pudimos leer el historial de tutorías.')
  }
  return { items: pagina.items.map(copiarTutoria), total: pagina.total, page: pagina.page, limit: pagina.limit, totalPages: pagina.totalPages }
}

export async function consultarDetalleTutoria(sesion: SesionUsuario, id: string, externa?: AbortSignal): Promise<DetalleTutoria> {
  if (!esIdentificador(id)) throw new ErrorConsultaTutorias('La dirección de la tutoría no es válida.', 'ausente')
  const datos = await consultar(id, sesion, externa)
  if (!esDetalleTutoria(datos) || datos.id_sesion !== id || (!tieneRol(sesion.roles, 'ADMINISTRADOR')
    && datos.id_tutee !== sesion.idUsuario && datos.id_tutor !== sesion.idUsuario)) {
    throw new ErrorConsultaTutorias('No pudimos leer el detalle de la tutoría.')
  }
  return {
    ...copiarTutoria(datos), datos_encuentro: {
      modalidad: datos.datos_encuentro.modalidad, lugar: datos.datos_encuentro.lugar, enlace: datos.datos_encuentro.enlace,
    },
    declaraciones: datos.declaraciones.map((declaracion) => ({
      id_declaracion: declaracion.id_declaracion, id_sesion: declaracion.id_sesion, id_usuario: declaracion.id_usuario,
      resultado_declarado: declaracion.resultado_declarado, id_usuario_inasistente: declaracion.id_usuario_inasistente,
      fecha_declaracion: declaracion.fecha_declaracion,
    })),
    acciones_disponibles: {
      aceptar: datos.acciones_disponibles.aceptar, rechazar: datos.acciones_disponibles.rechazar,
      cancelar: datos.acciones_disponibles.cancelar, declarar_cierre: datos.acciones_disponibles.declarar_cierre,
      calificar: datos.acciones_disponibles.calificar, resolver_conflicto: datos.acciones_disponibles.resolver_conflicto,
    },
  }
}

export function idsParticipantes(tutorias: readonly Tutoria[]): string[] {
  return [...new Set(tutorias.flatMap((tutoria) => [tutoria.id_tutor, tutoria.id_tutee]))]
}
