import type { Postulacion } from './postulacion'

export const DESCRIPCION_ESTADO_POSTULACION: Record<Postulacion['estado'], { etiqueta: string; detalle: string }> = {
  PENDIENTE: {
    etiqueta: 'En revisión',
    detalle: 'La administración está revisando tu certificado.',
  },
  PENDIENTE_ROL: {
    etiqueta: 'Aprobada, habilitando tutor',
    detalle: 'Tu postulación fue aprobada y estamos habilitando tu perfil de tutor.',
  },
  APROBADA: {
    etiqueta: 'Aprobada',
    detalle: 'Ya puedes dictar tutorías de esta materia. Si no ves las secciones de tutor, cierra sesión y vuelve a ingresar.',
  },
  RECHAZADA: {
    etiqueta: 'Rechazada',
    detalle: 'Puedes volver a postular a esta materia con un nuevo certificado.',
  },
}

// Mismos estados que materias-tutores considera activos al rechazar una postulación duplicada.
export const ESTADOS_POSTULACION_ACTIVA: ReadonlyArray<Postulacion['estado']> = ['PENDIENTE', 'PENDIENTE_ROL', 'APROBADA']

export type EstadoEnvioPostulacion =
  | { estado: 'inactivo' }
  | { estado: 'enviando' }
  | { estado: 'exitoso'; postulacion: Postulacion }
  | { estado: 'error'; mensaje: string }
