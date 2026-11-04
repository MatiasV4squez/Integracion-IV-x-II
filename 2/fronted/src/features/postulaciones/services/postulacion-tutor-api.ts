import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import type { Postulacion } from '../models/postulacion'
import { TAMANO_MAXIMO_CERTIFICADO, validarCertificado } from '../utils/validar-certificado'
import { esPostulacion } from '../utils/validar-postulacion'

const SESION_INVALIDA = 'Tu sesión no es válida o ha vencido. Inicia sesión nuevamente.'

function exigirSesion(sesion: SesionUsuario) {
  if (!sesion || typeof sesion.token !== 'string' || !sesion.token.trim()
    || !esIdentificador(sesion.idUsuario) || !Number.isFinite(sesion.expiraEn) || sesion.expiraEn <= Date.now()) {
    throw new Error(SESION_INVALIDA)
  }
}

function controlarError(error: unknown, signal: AbortSignal, externa: AbortSignal | undefined, mensaje: string): never {
  if (externa?.aborted) throw error
  if (signal.aborted) throw new Error('La solicitud tardó demasiado. Inténtalo de nuevo.')
  if (error instanceof TypeError) throw new Error('No pudimos conectar con el servidor. Inténtalo de nuevo.')
  throw error instanceof Error ? error : new Error(mensaje)
}

function copiarPostulacion(dato: Postulacion): Postulacion {
  return {
    idPostulacion: dato.idPostulacion, idUsuario: dato.idUsuario, idMateria: dato.idMateria,
    idAdministradorRevision: dato.idAdministradorRevision, certificadoNombre: dato.certificadoNombre,
    certificadoTipo: dato.certificadoTipo, notaAcreditada: dato.notaAcreditada, estado: dato.estado,
    fechaPostulacion: dato.fechaPostulacion, fechaRevision: dato.fechaRevision, motivoRechazo: dato.motivoRechazo,
  }
}

export async function consultarMisPostulaciones(sesion: SesionUsuario, externa?: AbortSignal): Promise<Postulacion[]> {
  externa?.throwIfAborted()
  exigirSesion(sesion)
  const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi('materias-tutores/postulaciones/mias'), {
      headers: { Authorization: 'Bearer ' + sesion.token, Accept: 'application/json' },
      cache: 'no-store',
      signal,
    })
    if (respuesta.status === 401) throw new Error(SESION_INVALIDA)
    if (!respuesta.ok) throw new Error('No se pudieron cargar tus postulaciones. Inténtalo de nuevo.')
    let datos: unknown
    try { datos = await respuesta.json() }
    catch (error) {
      if (signal.aborted) throw error
      throw new Error('No se pudieron leer tus postulaciones. Inténtalo de nuevo.')
    }
    if (!Array.isArray(datos) || !datos.every((dato) => esPostulacion(dato) && dato.idUsuario === sesion.idUsuario)
      || new Set(datos.map((dato) => dato.idPostulacion)).size !== datos.length) {
      throw new Error('El servidor devolvió datos de postulaciones no válidos.')
    }
    return datos.map(copiarPostulacion)
  } catch (error) {
    controlarError(error, signal, externa, 'No se pudieron cargar tus postulaciones.')
  }
}

// materias-tutores solo entrega el certificado a su dueño o a un administrador; aquí se evita pedir uno ajeno.
export async function obtenerMiCertificado(
  sesion: SesionUsuario, postulacion: Postulacion, externa?: AbortSignal,
): Promise<Blob> {
  externa?.throwIfAborted()
  exigirSesion(sesion)
  if (postulacion.idUsuario !== sesion.idUsuario || !esIdentificador(postulacion.idPostulacion)
    || !['application/pdf', 'image/png'].includes(postulacion.certificadoTipo)) {
    throw new Error('Los datos del certificado no son válidos.')
  }
  const signal = AbortSignal.any([AbortSignal.timeout(15000), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi(`materias-tutores/postulaciones/${postulacion.idPostulacion}/certificado`), {
      headers: { Authorization: 'Bearer ' + sesion.token }, cache: 'no-store', signal,
    })
    if (respuesta.status === 401) throw new Error(SESION_INVALIDA)
    if (respuesta.status === 404) throw new Error('El certificado ya no está disponible.')
    if (!respuesta.ok) throw new Error('No se pudo descargar el certificado. Inténtalo de nuevo.')
    const archivo = await respuesta.blob()
    if (archivo.type !== postulacion.certificadoTipo || archivo.size === 0 || archivo.size > TAMANO_MAXIMO_CERTIFICADO) {
      throw new Error('El archivo del certificado no es válido.')
    }
    return archivo
  } catch (error) {
    controlarError(error, signal, externa, 'No se pudo descargar el certificado.')
  }
}

export async function enviarPostulacionTutor(
  sesion: SesionUsuario, datos: { idMateria: string; certificado: File }, externa?: AbortSignal,
): Promise<Postulacion> {
  externa?.throwIfAborted()
  exigirSesion(sesion)
  if (!esIdentificador(datos.idMateria)) throw new Error('Selecciona una materia válida.')
  const validacion = await validarCertificado(datos.certificado)
  if ('error' in validacion) throw new Error(validacion.error)
  externa?.throwIfAborted()

  // Se fija el tipo MIME porque algunos sistemas entregan archivos sin él y el backend lo exige.
  const cuerpo = new FormData()
  cuerpo.append('idMateria', datos.idMateria)
  cuerpo.append('certificado', new File([datos.certificado], datos.certificado.name, { type: validacion.tipo }))

  // La subida de hasta 5 MB recibe más margen que las consultas.
  const signal = AbortSignal.any([AbortSignal.timeout(30000), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi('materias-tutores/postulaciones'), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + sesion.token, Accept: 'application/json' },
      body: cuerpo,
      signal,
    })
    if (respuesta.status !== 201) {
      throw new Error(
        respuesta.status === 400 ? 'El servidor rechazó el certificado o la materia. Revisa los datos e inténtalo nuevamente.'
          : respuesta.status === 401 ? SESION_INVALIDA
          : respuesta.status === 403 ? 'Tu cuenta no tiene permiso para postular.'
          : respuesta.status === 404 ? 'La materia seleccionada ya no está disponible. Actualiza el listado.'
          : respuesta.status === 409 ? 'Ya tienes una postulación activa para esta materia.'
          : respuesta.status === 413 ? 'El certificado debe pesar como máximo 5 MB.'
          : respuesta.status === 504 ? 'La solicitud tardó demasiado. Inténtalo de nuevo.'
          : 'No se pudo enviar la postulación. Inténtalo más tarde.',
      )
    }
    let postulacion: unknown
    try { postulacion = await respuesta.json() }
    catch (error) {
      if (signal.aborted) throw error
      throw new Error('La postulación se envió, pero no pudimos leer la respuesta. Actualiza tu historial.')
    }
    if (!esPostulacion(postulacion) || postulacion.idUsuario !== sesion.idUsuario
      || postulacion.idMateria !== datos.idMateria || postulacion.estado !== 'PENDIENTE') {
      throw new Error('La postulación se envió, pero el servidor devolvió datos no válidos. Actualiza tu historial.')
    }
    return copiarPostulacion(postulacion)
  } catch (error) {
    controlarError(error, signal, externa, 'No se pudo enviar la postulación.')
  }
}
