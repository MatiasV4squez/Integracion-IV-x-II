import { Inject, Injectable } from '@nestjs/common';
import type { Reporte } from '../dominio/reporte.js';
import {
  REPORTE_CONSULTA_REPOSITORY,
  type ReporteConsultaRepository,
} from '../dominio/ports/reporte-consulta.repository.js';
import { solicitudInvalida } from './errores.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface SolicitudConsultaReportesAdmin {
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  pagina?: string;
  limite?: string;
}

export interface ResultadoConsultaReportesAdmin {
  datos: Reporte[];
  paginacion: {
    pagina: number;
    limite: number;
    total: number;
    total_paginas: number;
  };
}

function parsePositiveInteger(
  value: string | undefined,
  defaultValue: number,
  field: string,
  maximum: number,
): number {
  if (value === undefined) return defaultValue;
  if (!/^[1-9]\d*$/.test(value)) {
    throw solicitudInvalida(`${field} debe ser un entero positivo.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw solicitudInvalida(`${field} debe ser menor o igual a ${maximum}.`);
  }
  return parsed;
}

function parseDate(
  value: string | undefined,
  field: string,
  endOfDay = false,
): Date | undefined {
  if (value === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw solicitudInvalida(`${field} debe usar el formato YYYY-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw solicitudInvalida(`${field} no contiene una fecha válida.`);
  }
  if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date;
}

@Injectable()
export class ConsultarReportesAdminUseCase {
  constructor(
    @Inject(REPORTE_CONSULTA_REPOSITORY)
    private readonly consulta: ReporteConsultaRepository,
  ) {}

  async ejecutar(
    solicitud: SolicitudConsultaReportesAdmin,
  ): Promise<ResultadoConsultaReportesAdmin> {
    const pagina = parsePositiveInteger(
      solicitud.pagina,
      DEFAULT_PAGE,
      'pagina',
      Number.MAX_SAFE_INTEGER,
    );
    const limite = parsePositiveInteger(
      solicitud.limite,
      DEFAULT_LIMIT,
      'limite',
      MAX_LIMIT,
    );
    const creadoDesde = parseDate(solicitud.fecha_desde, 'fecha_desde');
    const creadoHasta = parseDate(solicitud.fecha_hasta, 'fecha_hasta', true);

    if (creadoDesde && creadoHasta && creadoDesde > creadoHasta) {
      throw solicitudInvalida('fecha_desde no puede ser posterior a fecha_hasta.');
    }

    const estado = solicitud.estado?.trim().toUpperCase();
    if (solicitud.estado !== undefined && !estado) {
      throw solicitudInvalida('estado no puede estar vacío.');
    }

    const { datos, total } = await this.consulta.consultar(
      {
        ...(estado ? { estado } : {}),
        ...(creadoDesde ? { creadoDesde } : {}),
        ...(creadoHasta ? { creadoHasta } : {}),
      },
      pagina,
      limite,
    );

    return {
      datos,
      paginacion: {
        pagina,
        limite,
        total,
        total_paginas: Math.ceil(total / limite),
      },
    };
  }
}
