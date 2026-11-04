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

// Misma regla que agendamiento-sesiones: pendientes siempre, confirmadas solo antes del inicio.
export function puedeCancelar(sesion: Sesion, ahora = Date.now()): boolean {
  return sesion.estado_sesion === 'PENDIENTE'
    || (sesion.estado_sesion === 'CONFIRMADA' && Date.parse(sesion.inicio) > ahora)
}
