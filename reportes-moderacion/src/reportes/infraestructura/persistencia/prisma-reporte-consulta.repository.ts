import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  FiltroConsultaReportes,
  PaginaConsultaReportes,
  ReporteConsultaRepository,
} from '../../dominio/ports/reporte-consulta.repository.js';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class PrismaReporteConsultaRepository implements ReporteConsultaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async consultar(
    filtro: FiltroConsultaReportes,
    pagina: number,
    limite: number,
  ): Promise<PaginaConsultaReportes> {
    const where: Prisma.ReporteWhereInput = {
      ...(filtro.estado ? { estado: filtro.estado } : {}),
      ...(filtro.creadoDesde || filtro.creadoHasta
        ? {
            creadoEn: {
              ...(filtro.creadoDesde ? { gte: filtro.creadoDesde } : {}),
              ...(filtro.creadoHasta ? { lte: filtro.creadoHasta } : {}),
            },
          }
        : {}),
    };
    const skip = (pagina - 1) * limite;

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.reporte.findMany({
        where,
        orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
        skip,
        take: limite,
      }),
      this.prisma.reporte.count({ where }),
    ]);

    return { datos, total };
  }
}
