import { tieneRol } from '../auth/acceso-rutas'

export interface EnlaceNavegacion {
  etiqueta: string
  destino: string
}

export interface UsuarioEncabezado {
  etiqueta: string
  rol: string
}

const PUBLICOS: readonly EnlaceNavegacion[] = [
  { etiqueta: 'Inicio', destino: '/' },
  { etiqueta: 'Buscar tutores', destino: '/tutores' },
  { etiqueta: 'Materias', destino: '/materias' },
]

const ESTUDIANTE: readonly EnlaceNavegacion[] = [
  { etiqueta: 'Inicio', destino: '/inicio' },
  PUBLICOS[1],
  { etiqueta: 'Mi panel', destino: '/panel' },
  { etiqueta: 'Solicitar tutoría', destino: '/solicitudes/nueva' },
  PUBLICOS[2],
  { etiqueta: 'Ser tutor', destino: '/postulacion-tutor' },
]

const TUTOR: readonly EnlaceNavegacion[] = [
  PUBLICOS[0],
  { etiqueta: 'Solicitudes', destino: '/solicitudes/recibidas' },
  { etiqueta: 'Disponibilidad', destino: '/disponibilidad' },
  { etiqueta: 'Postulaciones', destino: '/postulacion-tutor' },
  PUBLICOS[2],
]

const ADMINISTRADOR: readonly EnlaceNavegacion[] = [
  { etiqueta: 'Postulaciones', destino: '/administracion/postulaciones' },
  PUBLICOS[1],
  PUBLICOS[2],
]

// Solo configura la presentación; la API mantiene la autorización de cada operación.
export function obtenerNavegacion(roles: readonly string[] = []): readonly EnlaceNavegacion[] {
  if (tieneRol(roles, 'ADMINISTRADOR')) return ADMINISTRADOR
  if (tieneRol(roles, 'TUTOR')) return TUTOR
  return roles.length > 0 ? ESTUDIANTE : PUBLICOS
}

export function obtenerInicioPorRol(roles: readonly string[] = []): string {
  if (tieneRol(roles, 'ADMINISTRADOR')) return '/administracion/postulaciones'
  if (tieneRol(roles, 'TUTOR')) return '/solicitudes/recibidas'
  return tieneRol(roles, 'ESTUDIANTE') ? '/inicio' : '/'
}

export function obtenerUsuarioEncabezado(sesion: { idUsuario: string; nombre?: string; roles: string[] } | null): UsuarioEncabezado | undefined {
  if (!sesion) return undefined
  const rol = tieneRol(sesion.roles, 'ADMINISTRADOR')
    ? 'Administrador' : tieneRol(sesion.roles, 'TUTOR') ? 'Tutor' : 'Estudiante'
  return { etiqueta: sesion.nombre ?? 'Usuario ' + sesion.idUsuario, rol }
}
