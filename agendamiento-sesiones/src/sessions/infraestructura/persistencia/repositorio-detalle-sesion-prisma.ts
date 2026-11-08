import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { RepositorioDetalleSesion } from '../../aplicacion/puertos/repositorio-detalle-sesion.puerto';
import type { DetalleSesion } from '../../dominio/entidades/detalle-sesion';

export class RepositorioDetalleSesionPrisma implements RepositorioDetalleSesion {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorId(idSesion: bigint): Promise<DetalleSesion | null> {
    return this.prisma.$transaction(
      (cliente) => cliente.sesion.findUnique({
        where: { id_sesion: idSesion },
        include: {
          declaraciones: { orderBy: [{ fecha_declaracion: 'asc' }, { id_declaracion: 'asc' }] },
          calificaciones: { orderBy: [{ fecha_calificacion: 'asc' }, { id_calificacion: 'asc' }] },
        },
      }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
