import { obtenerUrlApi } from '../../../config/api'
import { ErrorVerificacion, type VerificacionCuentaPuerto } from '../aplicacion/verificacion-cuenta.puerto'

async function enviar(accion: string, cuerpo: object, estadoEsperado: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  const respuesta = await fetch(obtenerUrlApi(`usuarios-auth/auth/${accion}`), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  })
  if (respuesta.status !== estadoEsperado) {
    const estado = accion !== 'verificar-correo' ? 'error'
      : respuesta.status === 400 ? 'invalida'
      : respuesta.status === 410 ? 'vencida'
      : respuesta.status === 409 ? 'utilizada' : 'error'
    throw new ErrorVerificacion(estado)
  }
  const datos: unknown = await respuesta.json()
  if (!datos || typeof datos !== 'object' || !('mensaje' in datos)
    || typeof datos.mensaje !== 'string' || !datos.mensaje.trim()) {
    throw new ErrorVerificacion('error')
  }
}

// Ambos endpoints son públicos: no necesitan JWT ni credenciales de cookies.
export const verificacionCuentaHttp: VerificacionCuentaPuerto = {
  confirmar: (token, signal) => enviar('verificar-correo', { token }, 200, signal),
  reenviar: (correo, signal) => enviar('reenviar-verificacion', { correo_institucional: correo.trim().toLowerCase() }, 202, signal),
}
