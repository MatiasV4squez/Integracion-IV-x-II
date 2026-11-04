import type { SesionUsuario } from './sesion-usuario'

export type RolPlataforma = 'ESTUDIANTE' | 'TUTOR' | 'ADMINISTRADOR'
export type ResultadoAcceso = 'permitido' | 'sesion' | 'permiso'

const ROLES_EQUIVALENTES: Record<RolPlataforma, readonly string[]> = {
  ESTUDIANTE: ['ESTUDIANTE'],
  TUTOR: ['TUTOR'],
  ADMINISTRADOR: ['ADMIN', 'ADMINISTRADOR'],
}

export function tieneRol(roles: readonly string[], rol: RolPlataforma): boolean {
  return ROLES_EQUIVALENTES[rol].some((equivalente) => roles.includes(equivalente))
}

// Solo decide qué mostrar; la API vuelve a validar el JWT y el rol en cada operación.
export function evaluarAcceso(
  sesion: Pick<SesionUsuario, 'roles'> | null, rolesPermitidos: readonly RolPlataforma[] = [],
): ResultadoAcceso {
  if (!sesion) return 'sesion'
  return rolesPermitidos.length === 0 || rolesPermitidos.some((rol) => tieneRol(sesion.roles, rol)) ? 'permitido' : 'permiso'
}

// Solo acepta rutas internas para no redirigir a otro sitio después del login.
export function leerDestinoSolicitado(estado: unknown): string | undefined {
  if (!estado || typeof estado !== 'object' || !('desde' in estado) || typeof estado.desde !== 'string') return undefined
  const { desde } = estado
  return desde.startsWith('/') && !desde.startsWith('//') && !desde.startsWith('/\\') && !/^\/login(?:[/?#]|$)/.test(desde)
    ? desde : undefined
}
