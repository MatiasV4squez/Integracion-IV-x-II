import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import { RESULTADOS_CIERRE, type ResultadoCierre } from '../models/tutoria'
import { esSesion } from '../utils/validar-sesion'

export const MAX_MOTIVO_RESOLUCION = 500
export const MAX_OBSERVACIONES_RESOLUCION = 500

export interface EntradaResolucionConflicto {
  nuevo_estado: ResultadoCierre
  motivo_resolucion: string
  observaciones?: string
}

export class ErrorResolverConflicto extends Error {
  readonly comprobarEstado: boolean

  constructor(mensaje: string, comprobarEstado = false) {
    super(mensaje)
    this.comprobarEstado = comprobarEstado
  }
}

function esAdministrador(sesion: SesionUsuario): boolean {
  return Array.isArray(sesion?.roles) && sesion.roles.some((rol) => typeof rol === 'string'
    && ['ADMIN', 'ADMINISTRADOR'].includes(rol.trim().toUpperCase()))
}

export async function resolverConflicto(id: string, sesion: SesionUsuario, entrada: EntradaResolucionConflicto, externa: AbortSignal): Promise<void> {
  externa.throwIfAborted()
  if (!sesion || !sesion.token || !esIdentificador(sesion.idUsuario)
    || !Number.isFinite(sesion.expiraEn) || sesion.expiraEn <= Date.now()) {
    throw new ErrorResolverConflicto('Tu sesión venció. Actualiza el detalle para volver a iniciar sesión.', true)
  }
  if (!esAdministrador(sesion)) {
    throw new ErrorResolverConflicto('Necesitas una cuenta de administrador para resolver conflictos.')
  }

  const nuevoEstado = entrada?.nuevo_estado
  const motivo = typeof entrada?.motivo_resolucion === 'string' ? entrada.motivo_resolucion.trim() : ''
  if (entrada?.observaciones !== undefined && typeof entrada.observaciones !== 'string') {
    throw new ErrorResolverConflicto('Revisa el estado final, el motivo y las observaciones de la resolución.')
  }
  const observaciones = typeof entrada?.observaciones === 'string' ? entrada.observaciones.trim() : ''
  if (!esIdentificador(id) || !RESULTADOS_CIERRE.some((estado) => estado === nuevoEstado)
    || !motivo || motivo.length > MAX_MOTIVO_RESOLUCION || observaciones.length > MAX_OBSERVACIONES_RESOLUCION) {
    throw new ErrorResolverConflicto('Revisa el estado final, el motivo y las observaciones de la resolución.')
  }

  const errorIncierto = () => new ErrorResolverConflicto(
    'No pudimos confirmar la resolución. Actualiza el detalle para comprobar si el conflicto quedó resuelto.', true,
  )
  try {
    const respuesta = await fetch(obtenerUrlApi('agendamiento-sesiones/sessions/' + id + '/resolve-conflict'), {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token },
      body: JSON.stringify({
        nuevo_estado: nuevoEstado,
        motivo_resolucion: motivo,
        ...(observaciones !== '' ? { observaciones } : {}),
      }),
      cache: 'no-store',
      signal: AbortSignal.any([externa, AbortSignal.timeout(10000)]),
    })
    if (respuesta.status === 401) throw new ErrorResolverConflicto('Tu sesión venció. Actualiza el detalle para volver a iniciar sesión.', true)
    if (respuesta.status === 403) throw new ErrorResolverConflicto('No tienes permiso para resolver conflictos.')
    if ([404, 409].includes(respuesta.status)) {
      throw new ErrorResolverConflicto('La sesión ya no está en conflicto. Actualiza el detalle antes de volver a intentarlo.', true)
    }
    if (respuesta.status === 400) throw new ErrorResolverConflicto('La resolución fue rechazada. Revisa el estado final y el motivo indicados.')
    if (!respuesta.ok) throw errorIncierto()

    const datos: unknown = await respuesta.json()
    if (!esSesion(datos) || datos.id_sesion !== id || datos.estado_sesion !== nuevoEstado) throw errorIncierto()
  } catch (error) {
    if (externa.aborted || error instanceof ErrorResolverConflicto) throw error
    throw errorIncierto()
  }
}
