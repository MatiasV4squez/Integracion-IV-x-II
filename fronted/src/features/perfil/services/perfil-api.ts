import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import { LIMITES_PERFIL, type CambiosPerfil, type PerfilUsuario, type TipoErrorPerfil } from '../models/perfil'

const TIEMPO_ESPERA_MS = 10000

export class ErrorPerfil extends Error {
  readonly tipo: TipoErrorPerfil
  constructor(mensaje: string, tipo: TipoErrorPerfil = 'consulta', options?: ErrorOptions) {
    super(mensaje, options)
    this.name = 'ErrorPerfil'
    this.tipo = tipo
  }
}

const textoOpcional = (valor: unknown, maximo: number) =>
  valor === null || (typeof valor === 'string' && valor.length <= maximo)

function esPerfil(valor: unknown, idUsuario: string): valor is PerfilUsuario {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false
  const datos = valor as Record<string, unknown>
  return datos.id === idUsuario
    && typeof datos.nombre === 'string' && datos.nombre.trim().length > 0
    && typeof datos.correo_institucional === 'string'
    && textoOpcional(datos.carrera, LIMITES_PERFIL.carrera)
    && textoOpcional(datos.biografia, LIMITES_PERFIL.biografia)
    && (datos.semestre_actual === null || (Number.isInteger(datos.semestre_actual)
      && (datos.semestre_actual as number) >= LIMITES_PERFIL.semestreMinimo
      && (datos.semestre_actual as number) <= LIMITES_PERFIL.semestreMaximo))
    && Array.isArray(datos.asignaturas_interes) && datos.asignaturas_interes.every(esIdentificador)
}

function exigirSesion(sesion: SesionUsuario) {
  if (!sesion.token || !esIdentificador(sesion.idUsuario) || sesion.expiraEn <= Date.now()) {
    throw new ErrorPerfil('Tu sesión no es válida o ha vencido. Inicia sesión nuevamente.', 'sesion')
  }
}

async function solicitar(sesion: SesionUsuario, opciones: RequestInit, externa: AbortSignal | undefined, accion: string): Promise<PerfilUsuario> {
  externa?.throwIfAborted()
  exigirSesion(sesion)
  const signal = AbortSignal.any([AbortSignal.timeout(TIEMPO_ESPERA_MS), ...(externa ? [externa] : [])])
  try {
    const respuesta = await fetch(obtenerUrlApi('usuarios-auth/usuarios/perfil'), {
      ...opciones,
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + sesion.token, ...opciones.headers },
      cache: 'no-store',
      signal,
    })
    if (respuesta.status === 401) throw new ErrorPerfil('Tu sesión no es válida o ha vencido. Inicia sesión nuevamente.', 'sesion')
    if (respuesta.status === 404) throw new ErrorPerfil('No encontramos tu cuenta. Inicia sesión nuevamente.', 'no-encontrado')
    // Una consulta no envía datos: un 400 indica que Auth aún no expone /usuarios/perfil, no un error del usuario.
    if (respuesta.status === 400 && opciones.method === 'GET') throw new ErrorPerfil(`No pudimos ${accion} tu perfil. Inténtalo de nuevo.`)
    if (respuesta.status === 400) throw new ErrorPerfil('Algunos datos del perfil no son válidos. Revísalos e inténtalo nuevamente.', 'invalido')
    if (!respuesta.ok) throw new ErrorPerfil(`No pudimos ${accion} tu perfil. Inténtalo de nuevo.`)
    let datos: unknown
    try { datos = await respuesta.json() } catch (error) {
      if (signal.aborted) throw error
      throw new ErrorPerfil(`No pudimos leer tu perfil. Inténtalo de nuevo.`, 'consulta', { cause: error })
    }
    if (!esPerfil(datos, sesion.idUsuario)) throw new ErrorPerfil('El servidor devolvió datos de perfil no válidos.')
    return {
      id: datos.id, nombre: datos.nombre, correo_institucional: datos.correo_institucional,
      carrera: datos.carrera, semestre_actual: datos.semestre_actual, biografia: datos.biografia,
      asignaturas_interes: [...datos.asignaturas_interes],
    }
  } catch (error) {
    if (externa?.aborted) throw error
    if (error instanceof ErrorPerfil) throw error
    throw new ErrorPerfil(signal.aborted ? 'La solicitud tardó demasiado. Inténtalo de nuevo.'
      : 'No pudimos conectar con el servidor. Inténtalo de nuevo.', 'consulta', { cause: error })
  }
}

export function consultarPerfil(sesion: SesionUsuario, signal?: AbortSignal): Promise<PerfilUsuario> {
  return solicitar(sesion, { method: 'GET' }, signal, 'cargar')
}

export function actualizarPerfil(sesion: SesionUsuario, cambios: CambiosPerfil, signal?: AbortSignal): Promise<PerfilUsuario> {
  if (Object.keys(cambios).length === 0) {
    return Promise.reject(new ErrorPerfil('No hay cambios para guardar.', 'invalido'))
  }
  return solicitar(sesion, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  }, signal, 'guardar')
}
