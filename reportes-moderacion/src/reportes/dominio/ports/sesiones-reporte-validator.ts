export const SESIONES_REPORTE_VALIDATOR = Symbol('SESIONES_REPORTE_VALIDATOR');

/**
 * Contrato con Agendamiento/Sesiones para BR10.
 *
 * El servicio de sesiones debe indicar si una sesión alcanzó anteriormente
 * el estado CONFIRMADA. Esta comprobación pertenece a ese servicio, ya que
 * Reportes/Moderación no replica ni consulta su base de datos.
 */
export interface SesionesReporteValidator {
  alcanzoEstadoConfirmada(idSesion: string): Promise<boolean>;
}
