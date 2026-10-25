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
]

const TUTOR: readonly EnlaceNavegacion[] = [
  PUBLICOS[0],
  { etiqueta: 'Solicitudes', destino: '/solicitudes/recibidas' },
  { etiqueta: 'Disponibilidad', destino: '/disponibilidad' },
  PUBLICOS[2],
]

const ADMINISTRADOR: readonly EnlaceNavegacion[] = [
  { etiqueta: 'Postulaciones', destino: '/administracion/postulaciones' },
  PUBLICOS[1],
  PUBLICOS[2],
]

// Solo configura la presentación; la API mantiene la autorización de cada operación.
export function obtenerNavegacion(roles: readonly string[] = []): readonly EnlaceNavegacion[] {
  if (roles.some((rol) => rol === 'ADMIN' || rol === 'ADMINISTRADOR')) return ADMINISTRADOR
  if (roles.includes('TUTOR')) return TUTOR
  return roles.length > 0 ? ESTUDIANTE : PUBLICOS
}

export function obtenerUsuarioEncabezado(sesion: { idUsuario: string; roles: string[] } | null): UsuarioEncabezado | undefined {
  if (!sesion) return undefined
  const rol = sesion.roles.some((valor) => valor === 'ADMIN' || valor === 'ADMINISTRADOR')
    ? 'Administrador' : sesion.roles.includes('TUTOR') ? 'Tutor' : 'Estudiante'
  return { etiqueta: 'Usuario ' + sesion.idUsuario, rol }
}
