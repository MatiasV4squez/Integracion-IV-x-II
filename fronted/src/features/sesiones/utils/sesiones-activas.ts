import { ESTADOS_ACTIVOS, type Sesion } from '../models/sesion'

export function seleccionarSesionesActivas(sesiones: Sesion[], idTutee: string): Sesion[] {
  return sesiones.filter((sesion) => sesion.id_tutee === idTutee
    && ESTADOS_ACTIVOS.some((activo) => activo === sesion.estado_sesion))
    .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio)
      || (BigInt(a.id_sesion) < BigInt(b.id_sesion) ? -1 : BigInt(a.id_sesion) > BigInt(b.id_sesion) ? 1 : 0))
}

const ETIQUETAS_ESTADO: Partial<Record<Sesion['estado_sesion'], string>> = {
  PENDIENTE: 'Pendiente de respuesta',
  CONFIRMADA: 'Confirmada',
  PENDIENTE_CIERRE: 'Por cerrar',
  EN_CONFLICTO: 'En conflicto',
}

export function etiquetarEstadoActivo(estado: Sesion['estado_sesion']): string {
  return ETIQUETAS_ESTADO[estado] ?? estado
}
