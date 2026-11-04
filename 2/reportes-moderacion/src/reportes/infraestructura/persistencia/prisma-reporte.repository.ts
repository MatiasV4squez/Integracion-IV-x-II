import { Injectable } from '@nestjs/common';
import type { Reporte } from '../../dominio/reporte.js';
import type {
  DatosNuevoReporte,
  DatosReactivacionReporte,
  DatosResolucionReporte,
  ReporteRepository,
} from '../../dominio/ports/reporte.repository.js';
import { PrismaService } from '../../../compartido/prisma.service.js';

@Injectable()
export class PrismaReporteRepository implements ReporteRepository {
  constructor(private readonly prisma: PrismaService) {}

  crear(datos: DatosNuevoReporte): Promise<Reporte> {
    return this.prisma.reporte.create({ data: datos });
  }

  buscarPorId(id: number): Promise<Reporte | null> {
    return this.prisma.reporte.findUnique({ where: { id } });
  }

  resolver(id: number, datos: DatosResolucionReporte): Promise<Reporte> {
    return this.prisma.reporte.update({ where: { id }, data: datos });
  }

  reactivar(id: number, datos: DatosReactivacionReporte): Promise<Reporte> {
    return this.prisma.reporte.update({ where: { id }, data: datos });
  }
}
