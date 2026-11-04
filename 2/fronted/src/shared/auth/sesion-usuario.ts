import { esIdentificador } from '../utils/identificadores'

export interface SesionUsuario {
  token: string
  idUsuario: string
  nombre?: string
  roles: string[]
  expiraEn: number
}

// Solo interpreta la sesión para presentar la interfaz. La API verifica la firma y los permisos.
export function interpretarSesion(token: string | null, ahora = Date.now()): SesionUsuario | null {
  if (!token || token.length > 16384) return null
  const partes = token.split('.')
  if (partes.length !== 3 || !partes.every((parte) => /^[A-Za-z0-9_-]+$/.test(parte))) return null
  try {
    const decodificar = (parte: string) => JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(parte.replace(/-/g, '+').replace(/_/g, '/')), (caracter) => caracter.charCodeAt(0)),
    )) as Record<string, unknown>
    const cabecera = decodificar(partes[0])
    const datos = decodificar(partes[1])
    if (cabecera.alg !== 'HS256' || !esIdentificador(datos.sub)
      || datos.iss !== 'stp-usuarios-auth'
      || !(datos.aud === 'stp-clients' || (Array.isArray(datos.aud) && datos.aud.includes('stp-clients')))
      || typeof datos.exp !== 'number' || !Number.isFinite(datos.exp) || datos.exp * 1000 <= ahora
      || !Array.isArray(datos.roles) || !datos.roles.every((rol) => typeof rol === 'string')) return null
    return { token, idUsuario: datos.sub, roles: datos.roles.map((rol) => rol.trim().toUpperCase()), expiraEn: datos.exp * 1000 }
  } catch {
    return null
  }
}
