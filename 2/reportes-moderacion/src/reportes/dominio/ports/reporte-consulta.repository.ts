import type { Reporte } from '../reporte.js';

export const REPORTE_CONSULTA_REPOSITORY = Symbol('REPORTE_CONSULTA_REPOSITORY');

export interface FiltroConsultaReportes {
  estado?: string;
  creadoDesde?: Date;
  creadoHasta?: Date;
}

export interface PaginaConsultaReportes {
  datos: Reporte[];
  total: number;
}

export interface ReporteConsultaRepository {
  consultar(
    filtro: FiltroConsultaReportes,
    pagina: number,
    limite: number,
  ): Promise<PaginaConsultaReportes>;
}
