import type { Prisma } from '../../../generated/prisma/client';
import type { RepositorioLiberaciones } from '../../aplicacion/puertos/repositorio-liberaciones.puerto';

export class RepositorioLiberacionesPrisma implements RepositorioLiberaciones {
  constructor(private readonly cliente: Prisma.TransactionClient) {}

  async registrarPendiente(idSesion: bigint, idBloque: bigint): Promise<void> {
    await this.cliente.liberacion_bloque_sesion.createMany({
      data: [{ id_sesion: idSesion, id_bloque: idBloque }],
      skipDuplicates: true,
    });
  }

  buscar(idSesion: bigint) {
    return this.cliente.liberacion_bloque_sesion.findUnique({
      where: { id_sesion: idSesion },
    });
  }

  consultarPendientes(limite: number) {
    return this.cliente.liberacion_bloque_sesion.findMany({
      where: { fecha_liberacion: null },
      orderBy: [{ intentos: 'asc' }, { fecha_creacion: 'asc' }],
      take: limite,
      select: { id_sesion: true },
    });
  }

  async registrarIntento(
    idSesion: bigint,
    fechaLiberacion?: Date,
    error?: string,
  ): Promise<void> {
    await this.cliente.liberacion_bloque_sesion.updateMany({
      where: { id_sesion: idSesion, fecha_liberacion: null },
      data: {
        intentos: { increment: 1 },
        ultimo_error: fechaLiberacion
          ? null
          : (error ?? 'No se pudo liberar el bloque.'),
        ...(fechaLiberacion ? { fecha_liberacion: fechaLiberacion } : {}),
      },
    });
  }
}
