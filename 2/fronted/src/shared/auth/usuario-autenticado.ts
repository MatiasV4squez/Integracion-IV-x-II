import { interpretarSesion } from './sesion-usuario'

export interface ResultadoInicioSesion {
  access_token: string
  usuario: {
    id_usuario: string
    nombre: string
  }
}

// Recibe la respuesta del login real y avisa a los componentes de esta pestaña.
export function guardarSesionUsuario(resultado: ResultadoInicioSesion) {
  const sesion = interpretarSesion(resultado.access_token)
  const nombre = resultado.usuario.nombre.trim()
  if (!sesion || sesion.idUsuario !== resultado.usuario.id_usuario || !nombre) {
    throw new Error('No pudimos guardar los datos del usuario autenticado.')
  }

  window.localStorage.setItem('usuario', JSON.stringify({ idUsuario: sesion.idUsuario, nombre }))
  window.localStorage.setItem('token', resultado.access_token)
  window.dispatchEvent(new Event('stp:sesion'))
}

// Mantiene la cabecera al día cuando el usuario cambia su nombre desde Mi perfil.
export function actualizarNombreUsuario(idUsuario: string, nombre: string) {
  const limpio = nombre.trim()
  if (!limpio) return
  try {
    window.localStorage.setItem('usuario', JSON.stringify({ idUsuario, nombre: limpio }))
  } catch {
    // Sin almacenamiento, la cabecera mostrará el nombre nuevo en el próximo inicio de sesión.
  }
  window.dispatchEvent(new Event('stp:sesion'))
}

// Retira la sesión local aunque la revocación en Auth no haya podido confirmarse.
export function cerrarSesionUsuario() {
  try {
    window.localStorage.removeItem('token')
    window.localStorage.removeItem('usuario')
  } finally {
    window.dispatchEvent(new Event('stp:sesion'))
  }
}

export function obtenerNombreUsuario(idUsuario: string, usuarioGuardado: string | null): string | undefined {
  if (!usuarioGuardado) return undefined
  try {
    const usuario: unknown = JSON.parse(usuarioGuardado)
    if (usuario && typeof usuario === 'object'
      && 'idUsuario' in usuario && usuario.idUsuario === idUsuario
      && 'nombre' in usuario && typeof usuario.nombre === 'string') {
      return usuario.nombre.trim() || undefined
    }
  } catch {
    // Un dato local inválido no debe impedir que se muestre el dashboard.
  }
  return undefined
}
