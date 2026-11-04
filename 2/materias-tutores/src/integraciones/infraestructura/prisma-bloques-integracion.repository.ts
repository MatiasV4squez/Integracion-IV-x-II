import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { BloquesIntegracionRepository } from '../aplicacion/puertos/bloques-integracion.repository.js';
import type { EstadoBloqueIntegracion } from '../dominio/estado-bloque.js';

@Injectable()
export class PrismaBloquesIntegracionRepository implements BloquesIntegracionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarEstado(idBloque: bigint): Promise<string | null> {
    const bloque = await this.prisma.bloqueHorario.findUnique({ where: { idBloque } });
    return bloque?.estadoBloque ?? null;
  }

  async cambiarSiEstado(idBloque: bigint, anterior: EstadoBloqueIntegracion, estado: EstadoBloqueIntegracion): Promise<boolean> {
    const resultado = await this.prisma.bloqueHorario.updateMany({
      where: { idBloque, estadoBloque: anterior },
      data: { estadoBloque: estado },
    });
    return resultado.count === 1;
  }
}
