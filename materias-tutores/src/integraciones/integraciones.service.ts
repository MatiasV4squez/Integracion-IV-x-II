import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class IntegracionesService {
  constructor(private readonly prisma: PrismaService) {}

  async cambiarEstadoBloque(
    idBloque: bigint,
    estado: 'DISPONIBLE' | 'RESERVADO',
  ) {
    const bloque = await this.prisma.bloqueHorario.findUnique({
      where: { idBloque },
    });
    if (!bloque) throw new NotFoundException('Bloque no encontrado');
    if (bloque.estadoBloque === estado)
      return { idBloque: idBloque.toString(), estadoBloque: estado };
    const anterior = estado === 'RESERVADO' ? 'DISPONIBLE' : 'RESERVADO';
    const resultado = await this.prisma.bloqueHorario.updateMany({
      where: { idBloque, estadoBloque: anterior },
      data: { estadoBloque: estado },
    });
    if (resultado.count !== 1)
      throw new ConflictException(
        'El bloque cambió o no permite esta transición',
      );
    return { idBloque: idBloque.toString(), estadoBloque: estado };
  }

}
