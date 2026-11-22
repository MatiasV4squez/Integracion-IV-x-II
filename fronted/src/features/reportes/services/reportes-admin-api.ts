import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import { ErrorModeracionReporte } from '../models/error-moderacion-reporte'
import {
  LIMITE_REPORTES_POR_PAGINA,
  RESOLUCIONES_REPORTE,
  type AccionModeracion,
  type ConflictoSesionPendiente,
  type EstadoReporte,
  type PaginacionReportes,
  type Reporte,
  type ResolucionReporte,
} from '../models/reporte'
import {
  MAX_MOTIVO_RESOLUCION,
  esReporte,
  esResultadoConsultaReportes,
  reconstruirConflicto,
  reconstruirReporte,
} from '../utils/validar-reporte'

const TIEMPO_ESPERA_MS = 10000

export interface ParametrosConsultaReportes {
  estado?: EstadoReporte
  fechaDesde?: string
  fechaHasta?: string
  pagina?: number
  limite?: number
}

export interface ResultadoConsultaReportes {
  reportes: Reporte[]
  paginacion: PaginacionReportes
  conflictos: ConflictoSesionPendiente[]
}

export interface SolicitudResolucion {
  estado: ResolucionReporte
  motivo?: string
}

const moderacionesEnCurso = new Set<string>()

function esAdministrador(sesion: SesionUsuario): boolean {
  return Array.isArray(sesion?.roles) && sesion.roles.some((rol) => typeof rol === 'string'
    && ['ADMIN', 'ADMINISTRADOR'].includes(rol.trim().toUpperCase()))
}

function exigirAdministrador(sesion: SesionUsuario) {
  if (!sesion || typeof sesion.token !== 'string' || !sesion.token.trim()
    || !esIdentificador(sesion.idUsuario) || !Number.isFinite(sesion.expiraEn)
    || sesion.expiraEn <= Date.now()) {
    throw new Error('Tu sesión no es válida o ha vencido. Inicia sesión nuevamente.')
  }
  if (!esAdministrador(sesion)) {
    throw new Error('Necesitas una cuenta de administrador para consultar reportes.')
  }
}

function controlarError(error: unknown, signal: AbortSignal, externa: AbortSignal | undefined, mensaje: string): never {
  if (externa?.aborted) throw error
  if (signal.aborted) throw new Error('La consulta tardó demasiado. Inténtalo de nuevo.')
  if (error instanceof TypeError) throw new Error('No pudimos conectar con el servidor. Inténtalo de nuevo.')
  throw error instanceof Error ? error : new Error(mensaje)
}

function comprobarRespuesta(respuesta: Response, mensaje: string) {
  if (respuesta.status === 401) throw new Error('Tu sesión no es válida o ha vencido. Inicia sesión nuevamente.')
  if (respuesta.status === 403) throw new Error('No tienes autorización para consultar esta información.')
  if (respuesta.status === 504) throw new Error('La consulta tardó demasiado. Inténtalo de nuevo.')
  if (!respuesta.ok) throw new Error(mensaje)
}

export async function consultarReportesAdmin(
  sesion: SesionUsuario,
  parametros: ParametrosConsultaReportes,
  externa?: AbortSignal,
): Promise<ResultadoConsultaReportes> {
  externa?.throwIfAborted()
  exigirAdministrador(sesion)
  const consulta = new URLSearchParams()
  if (parametros.estado !== undefined) consulta.set('estado', parametros.estado)
  if (parametros.fechaDesde !== undefined) consulta.set('fecha_desde', parametros.fechaDesde)
  if (parametros.fechaHasta !== undefined) consulta.set('fecha_hasta', parametros.fechaHasta)
  consulta.set('pagina', String(parametros.pagina ?? 1))
  consulta.set('limite', String(parametros.limite ?? LIMITE_REPORTES_POR_PAGINA))
  const signal = AbortSignal.any([AbortSignal.timeout(TIEMPO_ESPERA_MS), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi('reportes-moderacion/reportes/admin') + '?' + consulta.toString(), {
      headers: { Authorization: 'Bearer ' + sesion.token, Accept: 'application/json' },
      cache: 'no-store',
      signal,
    })
    comprobarRespuesta(respuesta, 'No se pudieron cargar los reportes. Inténtalo de nuevo.')
    let datos: unknown
    try { datos = await respuesta.json() }
    catch (error) {
      if (signal.aborted) throw error
      throw new Error('No se pudieron leer los reportes. Inténtalo de nuevo.')
    }
    if (!esResultadoConsultaReportes(datos)) {
      throw new Error('El servidor devolvió datos de reportes no válidos.')
    }
    return {
      reportes: datos.datos.map(reconstruirReporte),
      paginacion: {
        pagina: datos.paginacion.pagina,
        limite: datos.paginacion.limite,
        total: datos.paginacion.total,
        totalPaginas: datos.paginacion.total_paginas,
      },
      conflictos: datos.conflictos_sesion.map(reconstruirConflicto),
    }
  } catch (error) {
    controlarError(error, signal, externa, 'No se pudieron cargar los reportes.')
  }
}

function exigirSesionAdministrador(sesion: SesionUsuario, accion: AccionModeracion) {
  if (!sesion || typeof sesion.token !== 'string' || !sesion.token.trim()
    || !esIdentificador(sesion.idUsuario) || !Number.isFinite(sesion.expiraEn)
    || sesion.expiraEn <= Date.now()) {
    throw new ErrorModeracionReporte('Tu sesión no es válida o venció. Inicia sesión nuevamente.', 'sesion', accion)
  }
  if (!esAdministrador(sesion)) {
    throw new ErrorModeracionReporte('Necesitas una cuenta de administrador para moderar reportes.', 'permiso', accion)
  }
}

function exigirIdReporte(id: unknown, accion: AccionModeracion): number {
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    throw new ErrorModeracionReporte('El identificador del reporte no es válido.', 'validacion', accion)
  }
  return id
}

async function leerCodigoError(respuesta: Response): Promise<string | undefined> {
  try {
    const datos: unknown = await respuesta.json()
    if (datos && typeof datos === 'object' && 'code' in datos) {
      const code = (datos as { code: unknown }).code
      if (typeof code === 'string') return code
    }
  } catch {
    return undefined
  }
  return undefined
}

function errorHttpModeracion(estado: number, code: string | undefined, accion: AccionModeracion): ErrorModeracionReporte {
  const opciones = { estadoHttp: estado }
  if (estado === 400) return new ErrorModeracionReporte(
    'Los datos de la operación no son válidos. Revisa la resolución indicada.', 'validacion', accion, opciones)
  if (estado === 401) return new ErrorModeracionReporte(
    'Tu sesión no es válida o venció. Inicia sesión nuevamente.', 'sesion', accion, opciones)
  if (estado === 403) return new ErrorModeracionReporte(
    'No tienes permiso para moderar este reporte.', 'permiso', accion, opciones)
  if (estado === 404) return new ErrorModeracionReporte(
    'El reporte no está disponible. Actualiza el listado.', 'no-encontrado', accion, opciones)
  if (estado === 409) return new ErrorModeracionReporte(
    accion === 'reactivar'
      ? 'El reporte ya no admite reactivación. Consulta su estado antes de volver a actuar.'
      : 'El reporte ya fue resuelto. Consulta su estado antes de volver a actuar.',
    'conflicto', accion, opciones)
  if (estado === 503 && code === 'USUARIOS_AUTH_UNAVAILABLE') return new ErrorModeracionReporte(
    accion === 'reactivar'
      ? 'No se pudo reactivar la cuenta del usuario. El reporte no fue modificado; inténtalo nuevamente.'
      : 'No se pudo suspender la cuenta del usuario. El reporte sigue pendiente; inténtalo nuevamente.',
    'cuenta-no-actualizada', accion, opciones)
  if (estado === 503 && code === 'REPORT_AUTH_UNAVAILABLE') return new ErrorModeracionReporte(
    'El servidor no pudo verificar las credenciales. Inténtalo nuevamente.', 'verificacion-servidor', accion, opciones)
  return new ErrorModeracionReporte(
    'No pudimos confirmar el resultado de la operación. Actualiza el listado antes de repetirla.',
    'resultado-incierto', accion, opciones)
}

async function moderar(
  reporteId: number,
  accion: AccionModeracion,
  sesion: SesionUsuario,
  externa: AbortSignal | undefined,
  enviar: (signal: AbortSignal) => Promise<Response>,
  confirmar: (datos: unknown) => boolean,
  mensajeConfirmacion: string,
): Promise<Reporte> {
  const clave = sesion.idUsuario + ':' + reporteId
  if (moderacionesEnCurso.has(clave)) {
    throw new ErrorModeracionReporte('Ya hay una operación en curso para este reporte. Espera su respuesta.', 'en-curso', accion)
  }
  const signal = AbortSignal.any([AbortSignal.timeout(TIEMPO_ESPERA_MS), ...(externa ? [externa] : [])])
  moderacionesEnCurso.add(clave)
  try {
    const respuesta = await enviar(signal)
    if (!respuesta.ok) throw errorHttpModeracion(respuesta.status, await leerCodigoError(respuesta), accion)
    const datos: unknown = await respuesta.json()
    if (!esReporte(datos) || !confirmar(datos)) {
      throw new ErrorModeracionReporte(mensajeConfirmacion, 'resultado-incierto', accion)
    }
    return reconstruirReporte(datos)
  } catch (cause) {
    if (externa?.aborted) throw externa.reason
    if (cause instanceof ErrorModeracionReporte) throw cause
    throw new ErrorModeracionReporte(signal.aborted
      ? 'La operación excedió el tiempo de espera y pudo haberse aplicado. Consulta el estado del reporte antes de repetir la acción.'
      : 'No pudimos confirmar el resultado de la operación. Actualiza el listado antes de repetir la acción.',
    'resultado-incierto', accion, { cause })
  } finally {
    moderacionesEnCurso.delete(clave)
  }
}

export async function resolverReporte(
  id: number,
  resolucion: SolicitudResolucion,
  sesion: SesionUsuario,
  externa?: AbortSignal,
): Promise<Reporte> {
  const accion: AccionModeracion = 'resolver'
  externa?.throwIfAborted()
  exigirSesionAdministrador(sesion, accion)
  const reporteId = exigirIdReporte(id, accion)
  if (!RESOLUCIONES_REPORTE.some((valor) => valor === resolucion?.estado)) {
    throw new ErrorModeracionReporte('La resolución debe ser DESESTIMADO, ADVERTIDO o SUSPENDIDO.', 'validacion', accion)
  }
  let motivo: string | undefined
  if (resolucion.motivo !== undefined) {
    if (typeof resolucion.motivo !== 'string' || !resolucion.motivo.trim()) {
      throw new ErrorModeracionReporte('El motivo no puede estar vacío.', 'validacion', accion)
    }
    motivo = resolucion.motivo.trim()
    if (motivo.length > MAX_MOTIVO_RESOLUCION) {
      throw new ErrorModeracionReporte(`El motivo debe tener como máximo ${MAX_MOTIVO_RESOLUCION} caracteres.`, 'validacion', accion)
    }
  }
  let url: string
  try {
    url = obtenerUrlApi(`reportes-moderacion/reportes/${reporteId}/resolucion`)
  } catch (cause) {
    throw new ErrorModeracionReporte('No está configurada correctamente la conexión con la API Gateway.', 'configuracion', accion, { cause })
  }
  return moderar(
    reporteId,
    accion,
    sesion,
    externa,
    (signal) => fetch(url, {
      method: 'PATCH',
      signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token },
      body: JSON.stringify(motivo === undefined ? { estado: resolucion.estado } : { estado: resolucion.estado, motivo }),
    }),
    (datos) => {
      const reporte = datos as Reporte
      return reporte.id === reporteId
        && reporte.estado === resolucion.estado
        && reporte.resueltoPorId === sesion.idUsuario
        && reporte.resueltoEn !== null
        && (motivo === undefined ? reporte.motivo === null : reporte.motivo === motivo)
    },
    'La respuesta no confirma la resolución solicitada. Consulta el estado del reporte antes de repetir la acción.',
  )
}

export async function reactivarSuspension(
  id: number,
  sesion: SesionUsuario,
  externa?: AbortSignal,
): Promise<Reporte> {
  const accion: AccionModeracion = 'reactivar'
  externa?.throwIfAborted()
  exigirSesionAdministrador(sesion, accion)
  const reporteId = exigirIdReporte(id, accion)
  let url: string
  try {
    url = obtenerUrlApi(`reportes-moderacion/reportes/${reporteId}/reactivacion`)
  } catch (cause) {
    throw new ErrorModeracionReporte('No está configurada correctamente la conexión con la API Gateway.', 'configuracion', accion, { cause })
  }
  return moderar(
    reporteId,
    accion,
    sesion,
    externa,
    (signal) => fetch(url, {
      method: 'PATCH',
      signal,
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + sesion.token },
    }),
    (datos) => {
      const reporte = datos as Reporte
      return reporte.id === reporteId
        && reporte.estado === 'SUSPENDIDO'
        && reporte.reactivadoPorId === sesion.idUsuario
        && reporte.reactivadoEn !== null
    },
    'La respuesta no confirma la reactivación solicitada. Consulta el estado del reporte antes de repetir la acción.',
  )
}
