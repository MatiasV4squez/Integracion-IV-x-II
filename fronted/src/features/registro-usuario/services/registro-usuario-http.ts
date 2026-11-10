import { obtenerUrlApi } from '../../../config/api'
import { normalizarCorreo } from '../../../shared/utils/validaciones-formulario'
import { ErrorRegistro, type RegistroUsuarioPuerto } from '../aplicacion/registro-usuario.puerto'
import { validarContrasena, validarCorreoRegistro, validarNombre } from '../utils/validar-registro'

export const registroUsuarioHttp: RegistroUsuarioPuerto = {
  async registrar(datos, signal) {
    signal.throwIfAborted()
    const error = validarNombre(datos.nombre) ?? validarCorreoRegistro(datos.correo) ?? validarContrasena(datos.contrasena)
    if (error) throw new Error(error)
    // Auth publica el registro en /usuarios/registro; /auth/registro no existe y responde 404.
    const respuesta = await fetch(obtenerUrlApi('usuarios-auth/usuarios/registro'), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: datos.nombre.trim(),
        correo_institucional: normalizarCorreo(datos.correo),
        // Auth nombra password_hash al campo, pero recibe la contraseña en texto y la hashea con Argon2.
        password_hash: datos.contrasena,
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    })
    if (respuesta.status !== 201) {
      throw new ErrorRegistro(respuesta.status === 400 ? 'invalido' : respuesta.status === 409 ? 'duplicado' : 'error')
    }
    let resultado: unknown
    try { resultado = await respuesta.json() } catch { throw new ErrorRegistro('error') }
    if (!resultado || typeof resultado !== 'object'
      || !('estado' in resultado) || resultado.estado !== 'INACTIVO'
      || !('correo' in resultado) || resultado.correo !== normalizarCorreo(datos.correo)
      || !('verificacion' in resultado)
      || (resultado.verificacion !== 'ENLACE_GENERADO' && resultado.verificacion !== 'PENDIENTE_ENVIO')) {
      throw new ErrorRegistro('error')
    }
    return { correo: resultado.correo, verificacion: resultado.verificacion }
  },
}
