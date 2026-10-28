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
