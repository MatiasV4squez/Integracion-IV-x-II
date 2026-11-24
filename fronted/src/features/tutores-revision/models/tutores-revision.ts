export const ESTADOS_REPUTACION = ['ACTIVO', 'EN_REVISION'] as const
export type EstadoReputacion = (typeof ESTADOS_REPUTACION)[number]

export interface TutorReputacion {
  idTutor: string
  cantidadCalificaciones: number
  promedio: number | null
  estado: EstadoReputacion
}

export type ConsultaTutoresRevision =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string; tipo: 'sesion' | 'permiso' | 'consulta' }
  | { estado: 'listo'; tutores: TutorReputacion[] }
