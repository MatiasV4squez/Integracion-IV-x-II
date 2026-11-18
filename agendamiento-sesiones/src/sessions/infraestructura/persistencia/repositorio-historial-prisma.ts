import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { RepositorioHistorial } from '../../aplicacion/puertos/repositorio-historial.puerto';
import type { FiltrosHistorialPaginado } from '../../aplicacion/contratos/historial-paginado';

export class RepositorioHistorialPrisma implements RepositorioHistorial {
  constructor(private readonly prisma: PrismaService) {}

  consultar({ idUsuario, rol, estado, page, limit }: FiltrosHistorialPaginado) {
    const where: Prisma.sesionWhereInput = {
      ...(rol === 'ESTUDIANTE' ? { id_tutee: idUsuario }
        : rol === 'TUTOR' ? { id_tutor: idUsuario }
        : { OR: [{ id_tutee: idUsuario }, { id_tutor: idUsuario }] }),
      ...(estado === undefined ? {} : { estado_sesion: estado }),
    };

    return this.prisma.$transaction(async (cliente) => {
      const total = await cliente.sesion.count({ where });
      const items = await cliente.sesion.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ fecha_creacion: 'desc' }, { id_sesion: 'desc' }],
        select: {
          id_sesion: true, id_tutee: true, id_tutor: true, id_materia: true, id_bloque: true,
          estado_sesion: true, inicio: true, fin: true, fecha_creacion: true,
          fecha_actualizacion: true, fecha_confirmacion: true, resultado_provisional: true,
          calificaciones: {
            orderBy: [{ fecha_calificacion: 'asc' }, { id_calificacion: 'asc' }],
          },
        },
      });
      return { items, total };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
