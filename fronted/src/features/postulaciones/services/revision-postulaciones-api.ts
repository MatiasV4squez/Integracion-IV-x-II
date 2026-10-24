import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import { ErrorRevisionPostulacion } from '../models/error-revision-postulacion'
import type { DecisionPostulacion, Postulacion } from '../models/postulacion'
import { esMotivoRechazo, esNotaAcreditada, esPostulacion } from '../utils/validar-postulacion'

type Revision = { decision: 'aprobar'; notaAcreditada: number } | { decision: 'rechazar'; motivoRechazo: string }
const revisionesEnCurso = new Set<string>()

function exigirEntrada(id: string, revision: Revision, sesion: SesionUsuario) {
  const decision = revision.decision
  if (!sesion || typeof sesion.token !== 'string' || !sesion.token.trim() || !esIdentificador(sesion.idUsuario)
    || !Number.isFinite(sesion.expiraEn) || sesion.expiraEn <= Date.now()) {
    throw new ErrorRevisionPostulacion('Tu sesión no es válida o venció. Inicia sesión nuevamente.', 'sesion', decision)
  }
  // Es una comprobación para la interfaz; la API verifica la firma y el permiso real del administrador.
  if (!Array.isArray(sesion.roles) || !sesion.roles.some((rol) => typeof rol === 'string'
    && ['ADMINISTRADOR', 'ADMIN'].includes(rol.trim().toUpperCase()))) {
    throw new ErrorRevisionPostulacion('Necesitas una cuenta de administrador para revisar postulaciones.', 'permiso', decision)
  }
  if (!esIdentificador(id)) throw new ErrorRevisionPostulacion('El identificador de la postulación no es válido.', 'validacion', decision)
  if (decision === 'aprobar' && !esNotaAcreditada(revision.notaAcreditada)) {
    throw new ErrorRevisionPostulacion('La nota acreditada debe estar entre 5,0 y 7,0, con un máximo de un decimal.', 'validacion', decision)
  }
  if (decision === 'rechazar' && !esMotivoRechazo(revision.motivoRechazo)) {
    throw new ErrorRevisionPostulacion('El motivo de rechazo debe contener entre 3 y 500 caracteres.', 'validacion', decision)
  }
}

function errorHttp(estado: number, decision: DecisionPostulacion): ErrorRevisionPostulacion {
  const opciones = { estadoHttp: estado }
  if (estado === 400) return new ErrorRevisionPostulacion('Los datos de revisión no son válidos. Comprueba la nota o el motivo indicado.', 'validacion', decision, opciones)
  if (estado === 401) return new ErrorRevisionPostulacion('Tu sesión no es válida o venció. Inicia sesión nuevamente.', 'sesion', decision, opciones)
  if (estado === 403) return new ErrorRevisionPostulacion('No tienes permiso para revisar esta postulación.', 'permiso', decision, opciones)
  if (estado === 404) return new ErrorRevisionPostulacion('La postulación no está disponible. Actualiza el listado.', 'no-encontrada', decision, opciones)
  if (estado === 409) return new ErrorRevisionPostulacion('La postulación ya no admite esta revisión. Consulta su estado antes de volver a actuar.', 'conflicto', decision, opciones)
  if (estado === 503 && decision === 'aprobar') return new ErrorRevisionPostulacion(
    'No se pudo confirmar la aprobación completa. La postulación podría haber quedado pendiente de asignar el rol TUTOR. Consulta su estado antes de repetir la acción.',
    'resultado-incierto', decision, opciones)
  return new ErrorRevisionPostulacion('No pudimos confirmar el resultado de la revisión. Actualiza el listado antes de repetir la acción.', 'resultado-incierto', decision, opciones)
}

function resultadoEsperado(datos: unknown, id: string, revision: Revision, sesion: SesionUsuario): datos is Postulacion {
  return esPostulacion(datos) && datos.idPostulacion === id && datos.idAdministradorRevision === sesion.idUsuario
    && datos.fechaRevision !== null && (revision.decision === 'aprobar'
      ? datos.estado === 'APROBADA' && datos.notaAcreditada === revision.notaAcreditada && datos.motivoRechazo === null
      : datos.estado === 'RECHAZADA' && datos.motivoRechazo === revision.motivoRechazo.trim() && datos.notaAcreditada === null)
}

async function revisarPostulacion(id: string, revision: Revision, sesion: SesionUsuario, externa?: AbortSignal): Promise<Postulacion> {
  externa?.throwIfAborted()
  exigirEntrada(id, revision, sesion)
  let url: string
  try { url = obtenerUrlApi('materias-tutores/postulaciones/' + id + '/' + revision.decision) }
  catch (cause) { throw new ErrorRevisionPostulacion('No está configurada correctamente la conexión con la API Gateway.', 'configuracion', revision.decision, { cause }) }

  // Evita aprobar/rechazar simultáneamente la misma postulación desde este cliente.
  // La concurrencia entre navegadores y administradores se resuelve en el backend.
  const clave = sesion.idUsuario + ':' + id
  if (revisionesEnCurso.has(clave)) throw new ErrorRevisionPostulacion('Ya hay una revisión en curso para esta postulación. Espera su respuesta.', 'en-curso', revision.decision)
  const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(externa ? [externa] : [])])
  revisionesEnCurso.add(clave)
  try {
    const respuesta = await fetch(url, {
      method: 'PATCH', signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token },
      body: JSON.stringify(revision.decision === 'aprobar'
        ? { notaAcreditada: revision.notaAcreditada } : { motivoRechazo: revision.motivoRechazo.trim() }),
    })
    if (!respuesta.ok) throw errorHttp(respuesta.status, revision.decision)
    const datos: unknown = await respuesta.json()
    if (!resultadoEsperado(datos, id, revision, sesion)) throw new ErrorRevisionPostulacion(
      'La respuesta no confirma la revisión solicitada. Consulta el estado de la postulación antes de repetir la acción.', 'resultado-incierto', revision.decision)
    return {
      idPostulacion: datos.idPostulacion, idUsuario: datos.idUsuario, idMateria: datos.idMateria,
      idAdministradorRevision: datos.idAdministradorRevision, certificadoNombre: datos.certificadoNombre,
      certificadoTipo: datos.certificadoTipo, notaAcreditada: datos.notaAcreditada, estado: datos.estado,
      fechaPostulacion: datos.fechaPostulacion, fechaRevision: datos.fechaRevision, motivoRechazo: datos.motivoRechazo,
    }
  } catch (cause) {
    if (externa?.aborted) throw externa.reason
    if (cause instanceof ErrorRevisionPostulacion) throw cause
    throw new ErrorRevisionPostulacion(signal.aborted
      ? 'La revisión excedió el tiempo de espera y pudo haberse aplicado. Consulta su estado antes de repetir la acción.'
      : 'No pudimos confirmar el resultado de la revisión. Actualiza el listado antes de repetir la acción.', 'resultado-incierto', revision.decision, { cause })
  } finally {
    revisionesEnCurso.delete(clave)
  }
}

export function aprobarPostulacion(idPostulacion: string, notaAcreditada: number, sesion: SesionUsuario, signal?: AbortSignal): Promise<Postulacion> {
  return revisarPostulacion(idPostulacion, { decision: 'aprobar', notaAcreditada }, sesion, signal)
}

export function rechazarPostulacion(idPostulacion: string, motivoRechazo: string, sesion: SesionUsuario, signal?: AbortSignal): Promise<Postulacion> {
  return revisarPostulacion(idPostulacion, { decision: 'rechazar', motivoRechazo }, sesion, signal)
}
