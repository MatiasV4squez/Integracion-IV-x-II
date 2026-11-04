export const ESTADO_PENDIENTE = 'PENDIENTE';
export const ESTADO_SUSPENDIDO = 'SUSPENDIDO';
export const MAX_MOTIVO_LENGTH = 500;

export const RESOLUCIONES_VALIDAS = ['DESESTIMADO', 'ADVERTIDO', 'SUSPENDIDO'] as const;

export type ResolucionReporte = (typeof RESOLUCIONES_VALIDAS)[number];

export interface Reporte {
  id: number;
  titulo: string;
  descripcion: string;
  estado: string;
  idSesion: bigint;
  usuarioReportadorId: bigint;
  usuarioReportadoId: bigint;
  motivo: string | null;
  resueltoPorId: bigint | null;
  resueltoEn: Date | null;
  reactivadoPorId: bigint | null;
  reactivadoEn: Date | null;
  creadoEn: Date;
}

export function esResolucionValida(estado: string): estado is ResolucionReporte {
  return (RESOLUCIONES_VALIDAS as readonly string[]).includes(estado);
}

export function puedeResolverse(reporte: Reporte): boolean {
  return reporte.estado === ESTADO_PENDIENTE;
}

export function puedeReactivarse(reporte: Reporte): boolean {
  return reporte.estado === ESTADO_SUSPENDIDO && !reporte.reactivadoEn;
}
