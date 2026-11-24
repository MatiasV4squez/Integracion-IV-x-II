import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import type { TutorReputacion } from '../models/tutores-revision'
import { copiarTutorReputacion, esTutorReputacion } from '../utils/validar-tutores-revision'

export class ErrorConsultaTutoresRevision extends Error {
  readonly tipo: 'sesion' | 'permiso' | 'consulta'
  constructor(mensaje: string, tipo: ErrorConsultaTutoresRevision['tipo'] = 'consulta', opciones?: ErrorOptions) {
    super(mensaje, opciones)
    this.name = 'ErrorConsultaTutoresRevision'
    this.tipo = tipo
  }
}

function esAdministrador(sesion: SesionUsuario): boolean {
  return Array.isArray(sesion?.roles) && sesion.roles.some((rol) => typeof rol === 'string'
    && ['ADMIN', 'ADMINISTRADOR'].includes(rol.trim().toUpperCase()))
}

export async function consultarTutoresEnRevision(sesion: SesionUsuario, externa?: AbortSignal): Promise<TutorReputacion[]> {
  externa?.throwIfAborted()
  if (!sesion || !sesion.token || !esIdentificador(sesion.idUsuario)
    || !Number.isFinite(sesion.expiraEn) || sesion.expiraEn <= Date.now()) {
    throw new ErrorConsultaTutoresRevision('Tu sesión no es válida o venció. Inicia sesión nuevamente.', 'sesion')
  }
  if (!esAdministrador(sesion)) {
    throw new ErrorConsultaTutoresRevision('Necesitas una cuenta de administrador para consultar tutores en revisión.', 'permiso')
  }
  const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi('materias-tutores/tutores/en-revision'), {
      headers: { Authorization: 'Bearer ' + sesion.token, Accept: 'application/json' },
      cache: 'no-store',
      signal,
    })
    if (respuesta.status === 401) throw new ErrorConsultaTutoresRevision('Tu sesión no es válida o venció. Inicia sesión nuevamente.', 'sesion')
    if (respuesta.status === 403) throw new ErrorConsultaTutoresRevision('No tienes permiso para consultar esta información.', 'permiso')
    if (respuesta.status === 504) throw new ErrorConsultaTutoresRevision('La consulta tardó demasiado. Inténtalo de nuevo.', 'consulta')
    if (!respuesta.ok) throw new ErrorConsultaTutoresRevision('No pudimos cargar los tutores en revisión. Inténtalo de nuevo.')
    let datos: unknown
    try { datos = await respuesta.json() }
    catch (error) {
      if (signal.aborted) throw error
      throw new ErrorConsultaTutoresRevision('No pudimos leer la lista de tutores en revisión. Inténtalo de nuevo.')
    }
    if (!Array.isArray(datos) || !datos.every((dato) => esTutorReputacion(dato) && dato.estado === 'EN_REVISION')
      || new Set(datos.map((dato) => dato.idTutor)).size !== datos.length) {
      throw new ErrorConsultaTutoresRevision('El servidor devolvió datos de tutores en revisión no válidos.')
    }
    return datos.map(copiarTutorReputacion)
  } catch (error) {
    if (externa?.aborted) throw error
    if (error instanceof ErrorConsultaTutoresRevision) throw error
    throw new ErrorConsultaTutoresRevision(signal.aborted
      ? 'La consulta tardó demasiado. Inténtalo de nuevo.'
      : 'No pudimos conectar con el servidor. Inténtalo de nuevo.', 'consulta', { cause: error })
  }
}
