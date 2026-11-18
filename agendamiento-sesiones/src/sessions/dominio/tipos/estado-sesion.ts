export const ESTADOS_SESION = [
  'PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'EXPIRADA', 'CANCELADA',
  'PENDIENTE_CIERRE', 'COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA', 'EN_CONFLICTO',
] as const;

export type EstadoSesion = (typeof ESTADOS_SESION)[number];

export type ResultadoCierre = 'COMPLETADA' | 'NO_REALIZADA' | 'INASISTENCIA';
