import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { CreateReporteDto } from './dto/create-reporte.dto.js';
import { UpdateReporteDto } from './dto/update-reporte.dto.js';
import { ConsultaReportesAdminDto } from './dto/consulta-reportes-admin.dto.js';
import { ResolverReporteDto } from './dto/resolver-reporte.dto.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function solicitudInvalida(message: string): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'REPORT_FILTER_INVALID',
    message,
  });
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
export class ReportesService {
  // Instanciamos el cliente de la base de datos
  private prisma = new PrismaClient();

  // Convertimos la función a asíncrona (async)
  async create(createReporteDto: CreateReporteDto) {
    // Insertamos los datos. Prisma añadirá el estado "PENDIENTE" por defecto
    const nuevoReporte = await this.prisma.reporte.create({
      data: {
        titulo: createReporteDto.titulo,
        descripcion: createReporteDto.descripcion,
      },
    });

    return nuevoReporte;
  }

  async resolver(id: number, resolverReporteDto: ResolverReporteDto) {
    const reporteActualizado = await this.prisma.reporte.update({
      where: { id },
      data: {
        estado: resolverReporteDto.estado,
      },
    });

    return reporteActualizado;
  }
  
  findAll() {
    return `This action returns all reportes`;
  }

  async consultarParaAdmin(filtros: ConsultaReportesAdminDto) {
    const pagina = parsePositiveInteger(
      filtros.pagina,
      DEFAULT_PAGE,
      'pagina',
      Number.MAX_SAFE_INTEGER,
    );
    const limite = parsePositiveInteger(
      filtros.limite,
      DEFAULT_LIMIT,
      'limite',
      MAX_LIMIT,
    );
    const fechaDesde = parseDate(filtros.fecha_desde, 'fecha_desde');
    const fechaHasta = parseDate(filtros.fecha_hasta, 'fecha_hasta', true);

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      throw solicitudInvalida('fecha_desde no puede ser posterior a fecha_hasta.');
    }

    const estado = filtros.estado?.trim().toUpperCase();
    if (filtros.estado !== undefined && !estado) {
      throw solicitudInvalida('estado no puede estar vacío.');
    }

    const where: Prisma.ReporteWhereInput = {
      ...(estado ? { estado } : {}),
      ...(fechaDesde || fechaHasta
        ? {
            creadoEn: {
              ...(fechaDesde ? { gte: fechaDesde } : {}),
              ...(fechaHasta ? { lte: fechaHasta } : {}),
            },
          }
        : {}),
    };
    const skip = (pagina - 1) * limite;

    const [reportes, total] = await this.prisma.$transaction([
      this.prisma.reporte.findMany({
        where,
        orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
        skip,
        take: limite,
      }),
      this.prisma.reporte.count({ where }),
    ]);

    return {
      datos: reportes,
      paginacion: {
        pagina,
        limite,
        total,
        total_paginas: Math.ceil(total / limite),
      },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} reporte`;
  }

  update(id: number, updateReporteDto: UpdateReporteDto) {
    return `This action updates a #${id} reporte`;
  }

  remove(id: number) {
    return `This action removes a #${id} reporte`;
  }
}
