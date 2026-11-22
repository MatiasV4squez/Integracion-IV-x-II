import { obtenerUrlApi } from '../../../config/api'
import type { ResultadoInicioSesion } from '../../../shared/auth/usuario-autenticado'
import { normalizarCorreo, validarCorreo } from '../../../shared/utils/validaciones-formulario'
import { ErrorInicioSesion, type InicioSesionPuerto } from '../aplicacion/inicio-sesion.puerto'
import { validarContrasenaInicioSesion } from '../utils/validar-inicio-sesion'

async function leerCodigoError(respuesta: Response): Promise<unknown> {
  try {
    const datos: unknown = await respuesta.json()
    return datos && typeof datos === 'object' && 'code' in datos ? datos.code : undefined
  } catch {
    return undefined
  }
}

function leerResultado(datos: unknown): ResultadoInicioSesion {
  if (!datos || typeof datos !== 'object' || !('access_token' in datos) || typeof datos.access_token !== 'string'
    || !('usuario' in datos) || !datos.usuario || typeof datos.usuario !== 'object') {
    throw new ErrorInicioSesion('error')
  }
  const { usuario } = datos
  if (!('id_usuario' in usuario) || typeof usuario.id_usuario !== 'string'
    || !('nombre' in usuario) || typeof usuario.nombre !== 'string') {
    throw new ErrorInicioSesion('error')
  }
  return { access_token: datos.access_token, usuario: { id_usuario: usuario.id_usuario, nombre: usuario.nombre } }
}

export const inicioSesionHttp: InicioSesionPuerto = {
  async iniciarSesion(credenciales, signal) {
    signal.throwIfAborted()
    const error = validarCorreo(credenciales.correo) ?? validarContrasenaInicioSesion(credenciales.contrasena)
    if (error) throw new Error(error)
    const respuesta = await fetch(obtenerUrlApi('usuarios-auth/auth/login'), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo_institucional: normalizarCorreo(credenciales.correo),
        password: credenciales.contrasena,
      }),
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    })
    if (respuesta.status === 200) {
      let datos: unknown
      try { datos = await respuesta.json() } catch { throw new ErrorInicioSesion('error') }
      return leerResultado(datos)
    }
    if (respuesta.status === 400) throw new ErrorInicioSesion('invalido')
    if (respuesta.status === 401) throw new ErrorInicioSesion('credenciales')
    if (respuesta.status === 403) {
      const codigo = await leerCodigoError(respuesta)
      const estado = codigo === 'AUTH_EMAIL_NOT_VERIFIED' ? 'pendiente'
        : codigo === 'AUTH_ACCOUNT_SUSPENDED' ? 'suspendida'
        : codigo === 'AUTH_ACCOUNT_INACTIVE' ? 'inactiva' : 'error'
      throw new ErrorInicioSesion(estado)
    }
    throw new ErrorInicioSesion('error')
  },

  // Revoca el jti en Auth para que el token deje de servir antes de su vencimiento.
  async cerrarSesion(token, signal) {
    signal.throwIfAborted()
    const respuesta = await fetch(obtenerUrlApi('usuarios-auth/auth/logout'), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      keepalive: true,
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    })
    if (respuesta.status !== 204 && respuesta.status !== 401) throw new ErrorInicioSesion('error')
  },
}
