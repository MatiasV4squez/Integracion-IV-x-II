import type { Prisma } from '../../../generated/prisma/client';
import type { RepositorioEntregas } from '../../aplicacion/puertos/repositorio-entregas.puerto';

export class RepositorioEntregasPrisma implements RepositorioEntregas {
  constructor(private readonly cliente: Prisma.TransactionClient) {}

  async registrarPendiente(idCalificacion: bigint): Promise<void> {
    await this.cliente.entrega_reputacion_tutor.create({
      data: { id_calificacion: idCalificacion },
    });
  }

  buscar(idCalificacion: bigint) {
    return this.cliente.entrega_reputacion_tutor.findUnique({
      where: { id_calificacion: idCalificacion },
      include: { calificacion: true },
    });
  }

  consultarPendientes(limite: number) {
    return this.cliente.entrega_reputacion_tutor.findMany({
      where: { fecha_entrega: null },
      orderBy: [{ intentos: 'asc' }, { fecha_creacion: 'asc' }],
      take: limite,
      select: { id_calificacion: true },
    });
  }

  async registrarIntento(
    idCalificacion: bigint,
    fechaEntrega?: Date,
  ): Promise<void> {
    await this.cliente.entrega_reputacion_tutor.updateMany({
      where: { id_calificacion: idCalificacion, fecha_entrega: null },
      data: {
        intentos: { increment: 1 },
        ...(fechaEntrega ? { fecha_entrega: fechaEntrega } : {}),
      },
    });
  }
}
