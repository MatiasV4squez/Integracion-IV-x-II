import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { TutoresRepository } from '../application/ports/tutores.repository.js';
import type { TutorResumen } from '../application/models/tutor-resumen.js';
import type { Paginacion } from '../application/models/paginacion.js';

@Injectable()
export class PrismaTutoresRepository implements TutoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarHabilitadosPorMateria(idMateria: bigint, paginacion: Paginacion): Promise<{ items: TutorResumen[]; total: number }> {
    const tutores = await this.prisma.tutorMateria.findMany({
      where: {
        idMateria,
        vigente: true,
      },
      select: {
        idUsuario: true,
      },
      skip: (paginacion.page - 1) * paginacion.limit,
      take: paginacion.limit,
      orderBy: { idTutorMateria: 'asc' },
    });
    const idsTutores = tutores.map((tutor) => tutor.idUsuario);

    const total = await this.prisma.tutorMateria.count({
      where: { idMateria, vigente: true },
    });

    const perfiles = await this.prisma.perfilTutor.findMany({
      where: {
        idUsuario: { in: idsTutores },
      },
      select: {
        idUsuario: true,
        sumaCalificaciones: true,
        cantidadCalificaciones: true,
      },
    });

    const perfilesPorUsuario = new Map(perfiles.map((perfil) => [perfil.idUsuario, perfil]));

    const items = tutores.map((tutor) => {
      const perfil = perfilesPorUsuario.get(tutor.idUsuario);
      return {
        idTutor: tutor.idUsuario.toString(),
        promedioCalificaciones: perfil && perfil.cantidadCalificaciones > 0 ? perfil.sumaCalificaciones / perfil.cantidadCalificaciones : null,
        cantidadCalificaciones: perfil ? perfil.cantidadCalificaciones : 0,
      };
    });

    return { items, total };
  }
}
