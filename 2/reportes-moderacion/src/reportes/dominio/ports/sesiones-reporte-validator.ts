export const SESIONES_REPORTE_VALIDATOR = Symbol('SESIONES_REPORTE_VALIDATOR');

export interface ParticipacionSesion {
  alcanzoEstadoConfirmada: boolean;
  idTutor: string;
  idTutee: string;
}

export interface SesionesReporteValidator {
  consultarParaReporte(idSesion: string): Promise<ParticipacionSesion | null>;
}
