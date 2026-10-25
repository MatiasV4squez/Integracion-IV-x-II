import { interpretarSesion } from './sesion-usuario'

interface ResultadoInicioSesion {
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
