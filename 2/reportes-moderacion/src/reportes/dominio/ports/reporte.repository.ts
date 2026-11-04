import type { Reporte } from '../reporte.js';

export const REPORTE_REPOSITORY = Symbol('REPORTE_REPOSITORY');

export interface DatosNuevoReporte {
  titulo: string;
  descripcion: string;
  idSesion: bigint;
  usuarioReportadorId: bigint;
  usuarioReportadoId: bigint;
}

export interface DatosResolucionReporte {
  estado: string;
  motivo: string | null;
  resueltoPorId: bigint;
  resueltoEn: Date;
}

export interface DatosReactivacionReporte {
  reactivadoPorId: bigint;
  reactivadoEn: Date;
}

export interface ReporteRepository {
  crear(datos: DatosNuevoReporte): Promise<Reporte>;
  buscarPorId(id: number): Promise<Reporte | null>;
  resolver(id: number, datos: DatosResolucionReporte): Promise<Reporte>;
  reactivar(id: number, datos: DatosReactivacionReporte): Promise<Reporte>;
}
