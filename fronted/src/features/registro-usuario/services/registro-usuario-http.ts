import { obtenerUrlApi } from '../../../config/api'
import { normalizarCorreo, validarCorreo } from '../../../shared/utils/validaciones-formulario'
import { ErrorRegistro, type RegistroUsuarioPuerto } from '../aplicacion/registro-usuario.puerto'
import { validarContrasena, validarNombre } from '../utils/validar-registro'

export const registroUsuarioHttp: RegistroUsuarioPuerto = {
  async registrar(datos, signal) {
    signal.throwIfAborted()
    const error = validarNombre(datos.nombre) ?? validarCorreo(datos.correo) ?? validarContrasena(datos.contrasena)
    if (error) throw new Error(error)
    const respuesta = await fetch(obtenerUrlApi('usuarios-auth/auth/registro'), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: datos.nombre.trim(),
        correo_institucional: normalizarCorreo(datos.correo),
        contrasena: datos.contrasena,
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    })
    if (respuesta.status !== 201) {
      throw new ErrorRegistro(respuesta.status === 400 ? 'invalido' : respuesta.status === 409 ? 'duplicado' : 'error')
    }
  },
}
