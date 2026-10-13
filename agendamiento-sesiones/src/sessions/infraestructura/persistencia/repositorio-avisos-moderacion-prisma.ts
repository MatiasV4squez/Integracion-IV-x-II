import type { Prisma } from '../../../generated/prisma/client';
import type { AvisoModeracion, ContenidoAvisoModeracion } from '../../aplicacion/contratos/avisos-moderacion';
import type { RepositorioAvisosModeracion } from '../../aplicacion/puertos/repositorio-avisos-moderacion.puerto';

export class RepositorioAvisosModeracionPrisma implements RepositorioAvisosModeracion {
  constructor(private readonly cliente: Prisma.TransactionClient) {}

  async registrarPendiente(
    contenido: ContenidoAvisoModeracion,
  ): Promise<bigint> {
    const aviso = await this.cliente.aviso_moderacion_sesion.create({
      data: {
        id_sesion: BigInt(contenido.id_sesion),
        tipo: contenido.tipo,
        contenido,
      },
      select: { id_aviso: true },
    });
    return aviso.id_aviso;
  }

  async buscar(idAviso: bigint): Promise<AvisoModeracion | null> {
    const aviso = await this.cliente.aviso_moderacion_sesion.findUnique({
      where: { id_aviso: idAviso },
    });
    return aviso
      ? {
          ...aviso,
          contenido: aviso.contenido as ContenidoAvisoModeracion,
        }
      : null;
  }

  async existeConflictoPendiente(idSesion: bigint): Promise<boolean> {
    const aviso = await this.cliente.aviso_moderacion_sesion.findFirst({
      where: {
        id_sesion: idSesion,
        tipo: 'CONFLICTO_DETECTADO',
        fecha_entrega: null,
      },
      select: { id_aviso: true },
    });
    return aviso !== null;
  }

  consultarPendientes(limite: number) {
    return this.cliente.aviso_moderacion_sesion.findMany({
      where: {
        fecha_entrega: null,
        OR: [
          { tipo: 'CONFLICTO_DETECTADO' },
          {
            sesion: {
              avisos_moderacion: {
                none: { tipo: 'CONFLICTO_DETECTADO', fecha_entrega: null },
              },
            },
          },
        ],
      },
      orderBy: [
        { intentos: 'asc' },
        { fecha_creacion: 'asc' },
        { id_aviso: 'asc' },
      ],
      take: limite,
      select: { id_aviso: true },
    });
  }

  async registrarIntento(
    idAviso: bigint,
    fechaEntrega?: Date,
    error?: string,
  ): Promise<void> {
    await this.cliente.aviso_moderacion_sesion.updateMany({
      where: { id_aviso: idAviso, fecha_entrega: null },
      data: {
        intentos: { increment: 1 },
        ultimo_error: error ?? null,
        ...(fechaEntrega ? { fecha_entrega: fechaEntrega } : {}),
      },
    });
  }
}
