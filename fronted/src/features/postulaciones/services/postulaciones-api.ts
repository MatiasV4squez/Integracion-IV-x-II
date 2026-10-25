import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import type { Postulacion } from '../models/postulacion'
import { esPostulacion } from '../utils/validar-postulacion'

function exigirAdministrador(sesion: SesionUsuario) {
  if (!sesion || typeof sesion.token !== 'string' || !sesion.token.trim()
    || !esIdentificador(sesion.idUsuario) || !Number.isFinite(sesion.expiraEn)
    || sesion.expiraEn <= Date.now()) {
    throw new Error('Tu sesión no es válida o ha vencido. Inicia sesión nuevamente.')
  }
  if (!Array.isArray(sesion.roles)
    || !sesion.roles.some((rol) => typeof rol === 'string' && ['ADMIN', 'ADMINISTRADOR'].includes(rol.trim().toUpperCase()))) {
    throw new Error('Necesitas una cuenta de administrador para consultar postulaciones.')
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

export async function consultarPostulaciones(sesion: SesionUsuario, externa?: AbortSignal): Promise<Postulacion[]> {
  externa?.throwIfAborted()
  exigirAdministrador(sesion)
  const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi('materias-tutores/postulaciones/pendientes'), {
      headers: { Authorization: 'Bearer ' + sesion.token, Accept: 'application/json' },
      cache: 'no-store',
      signal,
    })
    comprobarRespuesta(respuesta, 'No se pudieron cargar las postulaciones. Inténtalo de nuevo.')
    let datos: unknown
    try { datos = await respuesta.json() }
    catch (error) {
      if (signal.aborted) throw error
      throw new Error('No se pudieron leer las postulaciones. Inténtalo de nuevo.')
    }
    if (!Array.isArray(datos) || !datos.every((dato) => esPostulacion(dato)
      && dato.motivoRechazo === null
      && (dato.estado === 'PENDIENTE'
        ? dato.fechaRevision === null && dato.notaAcreditada === null && dato.idAdministradorRevision === null
        : dato.estado === 'PENDIENTE_ROL'
          && dato.fechaRevision !== null && dato.notaAcreditada !== null && dato.idAdministradorRevision !== null))
      || new Set(datos.map((dato) => dato.idPostulacion)).size !== datos.length) {
      throw new Error('El servidor devolvió datos de postulaciones no válidos.')
    }
    return datos.map((dato) => ({
      idPostulacion: dato.idPostulacion, idUsuario: dato.idUsuario, idMateria: dato.idMateria,
      certificadoNombre: dato.certificadoNombre, certificadoTipo: dato.certificadoTipo,
      estado: dato.estado, fechaPostulacion: dato.fechaPostulacion, fechaRevision: dato.fechaRevision,
      notaAcreditada: dato.notaAcreditada, motivoRechazo: dato.motivoRechazo,
      idAdministradorRevision: dato.idAdministradorRevision,
    }))
  } catch (error) {
    controlarError(error, signal, externa, 'No se pudieron cargar las postulaciones.')
  }
}

export async function obtenerCertificadoPostulacion(sesion: SesionUsuario, postulacion: Postulacion, externa?: AbortSignal): Promise<Blob> {
  externa?.throwIfAborted()
  exigirAdministrador(sesion)
  if (!esIdentificador(postulacion.idPostulacion)
    || !['application/pdf', 'image/png'].includes(postulacion.certificadoTipo)) {
    throw new Error('Los datos del certificado no son válidos.')
  }
  const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi(`materias-tutores/postulaciones/${postulacion.idPostulacion}/certificado`), {
      headers: { Authorization: 'Bearer ' + sesion.token }, cache: 'no-store', signal,
    })
    if (respuesta.status === 404) throw new Error('El certificado ya no está disponible. Actualiza el listado.')
    comprobarRespuesta(respuesta, 'No se pudo descargar el certificado. Inténtalo de nuevo.')
    const archivo = await respuesta.blob()
    if (archivo.type !== postulacion.certificadoTipo || archivo.size === 0 || archivo.size > 5_000_000) {
      throw new Error('El archivo del certificado no es válido.')
    }
    return archivo
  } catch (error) {
    controlarError(error, signal, externa, 'No se pudo descargar el certificado.')
  }
}
