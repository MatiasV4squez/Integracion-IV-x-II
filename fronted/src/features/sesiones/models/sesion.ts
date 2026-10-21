export const ESTADOS_SESION = [
  'PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'EXPIRADA', 'CANCELADA',
  'PENDIENTE_CIERRE', 'COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA', 'EN_CONFLICTO',
] as const

export interface Sesion {
  id_sesion: string
  id_tutee: string
  id_tutor: string
  id_materia: string
  id_bloque: string
  estado_sesion: typeof ESTADOS_SESION[number]
  inicio: string
  fin: string
  fecha_creacion: string
  fecha_actualizacion: string
  resultado_provisional: boolean
}

export type ConsultaSolicitudes =
  | { estado: 'cargando' }
  | { estado: 'listo'; solicitudes: Sesion[] }
  | { estado: 'error'; mensaje: string; tipo: 'sesion' | 'permiso' | 'consulta' }
