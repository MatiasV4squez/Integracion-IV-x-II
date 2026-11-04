export type EstadoSesion =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'RECHAZADA'
  | 'EXPIRADA'
  | 'CANCELADA'
  | 'PENDIENTE_CIERRE'
  | 'COMPLETADA'
  | 'NO_REALIZADA'
  | 'INASISTENCIA'
  | 'EN_CONFLICTO';

export type ResultadoCierre = 'COMPLETADA' | 'NO_REALIZADA' | 'INASISTENCIA';
