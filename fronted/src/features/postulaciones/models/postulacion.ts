export const ESTADOS_POSTULACION = ['PENDIENTE', 'PENDIENTE_ROL', 'APROBADA', 'RECHAZADA'] as const

export interface Postulacion {
  idPostulacion: string
  idUsuario: string
  idMateria: string
  idAdministradorRevision: string | null
  certificadoNombre: string
  certificadoTipo: 'application/pdf' | 'image/png'
  notaAcreditada: number | null
  estado: typeof ESTADOS_POSTULACION[number]
  fechaPostulacion: string
  fechaRevision: string | null
  motivoRechazo: string | null
}

export type DecisionPostulacion = 'aprobar' | 'rechazar'
