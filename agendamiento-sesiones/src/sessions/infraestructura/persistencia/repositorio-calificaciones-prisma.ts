import type { Prisma } from '../../../generated/prisma/client';
import type { Calificacion } from '../../dominio/entidades/calificacion';
import type { RepositorioCalificaciones } from '../../aplicacion/puertos/repositorio-calificaciones.puerto';

export class RepositorioCalificacionesPrisma implements RepositorioCalificaciones {
  constructor(private readonly cliente: Prisma.TransactionClient) {}

  async registrarSiNoExiste(
    calificacion: Omit<Calificacion, 'id_calificacion' | 'fecha_calificacion'>,
  ): Promise<boolean> {
    const resultado = await this.cliente.calificacion.createMany({
      data: [calificacion],
      skipDuplicates: true,
    });
    return resultado.count === 1;
  }

  buscarPorEvaluador(idSesion: bigint, idEvaluador: bigint) {
    return this.cliente.calificacion.findUniqueOrThrow({
      where: {
        id_sesion_id_evaluador: {
          id_sesion: idSesion,
          id_evaluador: idEvaluador,
        },
      },
    });
  }

  async resumirNotasComoTutor(idTutor: bigint) {
    const resumen = await this.cliente.calificacion.aggregate({
      where: { id_evaluado: idTutor, sesion: { id_tutor: idTutor } },
      _avg: { puntuacion: true },
      _count: { _all: true },
    });
    return { cantidad: resumen._count._all, promedio: resumen._avg.puntuacion };
  }
}
