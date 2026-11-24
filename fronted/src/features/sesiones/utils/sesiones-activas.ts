import type { Sesion } from '../models/sesion'

const ETIQUETAS_ESTADO: Partial<Record<Sesion['estado_sesion'], string>> = {
  PENDIENTE: 'Pendiente de respuesta',
  CONFIRMADA: 'Confirmada',
  PENDIENTE_CIERRE: 'Por cerrar',
  EN_CONFLICTO: 'En conflicto',
}

export function etiquetarEstadoActivo(estado: Sesion['estado_sesion']): string {
  return ETIQUETAS_ESTADO[estado] ?? estado
}

// El estudiante también puede retirar su solicitud pendiente; el tutor solo cancela confirmadas.
export function puedeCancelar(sesion: Sesion, idUsuario: string, ahora = Date.now()): boolean {
  if (sesion.id_tutee !== idUsuario && sesion.id_tutor !== idUsuario) return false
  return (sesion.estado_sesion === 'PENDIENTE' && sesion.id_tutee === idUsuario)
    || (sesion.estado_sesion === 'CONFIRMADA' && Date.parse(sesion.inicio) > ahora)
}
