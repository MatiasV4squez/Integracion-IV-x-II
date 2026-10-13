import type { Prisma } from '../../../generated/prisma/client';
import type { RepositorioSesiones } from '../../aplicacion/puertos/repositorio-sesiones.puerto';
import type { Sesion } from '../../dominio/entidades/sesion';
import type { EstadoSesion } from '../../dominio/tipos/estado-sesion';
import { ESTADOS_OCUPADOS } from '../../dominio/reglas/reglas-sesion';
import type { NuevaSesion } from '../../aplicacion/contratos/entradas-sesion';

export class RepositorioSesionesPrisma implements RepositorioSesiones {
  constructor(private readonly cliente: Prisma.TransactionClient) {}

  contarPendientes(idEstudiante: bigint): Promise<number> {
    return this.cliente.sesion.count({
      where: { id_tutee: idEstudiante, estado_sesion: 'PENDIENTE' },
    });
  }

  async existeCompromiso(solicitud: NuevaSesion): Promise<boolean> {
    const participantes = [solicitud.id_tutor, solicitud.id_tutee];
    const encontrada = await this.cliente.sesion.findFirst({
      where: {
        estado_sesion: { in: ESTADOS_OCUPADOS },
        OR: [
          { id_bloque: solicitud.id_bloque },
          {
            inicio: { lt: solicitud.fin },
            fin: { gt: solicitud.inicio },
            OR: [
              { id_tutor: { in: participantes } },
              { id_tutee: { in: participantes } },
            ],
          },
        ],
      },
      select: { id_sesion: true },
    });
    return encontrada !== null;
  }

  crearPendiente(solicitud: NuevaSesion) {
    return this.cliente.sesion.create({
      data: { ...solicitud, estado_sesion: 'PENDIENTE' },
    });
  }

  async existeSesionActivaEnBloque(idBloque: bigint): Promise<boolean> {
    return (
      (await this.cliente.sesion.findFirst({
        where: { id_bloque: idBloque, estado_sesion: { in: ESTADOS_OCUPADOS } },
        select: { id_sesion: true },
      })) !== null
    );
  }

  buscarPorId(id: bigint) {
    return this.cliente.sesion.findUnique({ where: { id_sesion: id } });
  }

  consultarHistorial(idUsuario: bigint) {
    return this.cliente.sesion.findMany({
      where: { OR: [{ id_tutee: idUsuario }, { id_tutor: idUsuario }] },
      orderBy: { fecha_creacion: 'desc' },
      include: { calificaciones: true },
    });
  }

  async existeSolapamiento(sesion: Sesion): Promise<boolean> {
    const encontrada = await this.cliente.sesion.findFirst({
      where: {
        id_sesion: { not: sesion.id_sesion },
        OR: [{ id_tutor: sesion.id_tutor }, { id_tutee: sesion.id_tutee }],
        estado_sesion: { in: ESTADOS_OCUPADOS },
        inicio: { lt: sesion.fin },
        fin: { gt: sesion.inicio },
      },
      select: { id_sesion: true },
    });
    return encontrada !== null;
  }

  async haComenzado(inicio: Date): Promise<boolean> {
    const [resultado] = await this.cliente.$queryRaw<
      Array<{ iniciado: boolean }>
    >`
      SELECT clock_timestamp() >= ${inicio}::timestamptz AS iniciado
    `;
    return resultado.iniciado;
  }

  async cambiarEstado(
    sesion: Sesion,
    nuevoEstado: EstadoSesion,
    provisional: boolean,
  ) {
    const resultado = await this.cliente.sesion.updateMany({
      where: {
        id_sesion: sesion.id_sesion,
        estado_sesion: sesion.estado_sesion,
      },
      data: { estado_sesion: nuevoEstado, resultado_provisional: provisional },
    });
    if (resultado.count !== 1) return null;
    return this.cliente.sesion.findUniqueOrThrow({
      where: { id_sesion: sesion.id_sesion },
    });
  }

  buscarPendientesVencidas(limite: Date) {
    return this.cliente.sesion.findMany({
      where: { estado_sesion: 'PENDIENTE', fecha_creacion: { lte: limite } },
    });
  }

  async expirarSiSiguePendiente(id: bigint, limite: Date): Promise<boolean> {
    const resultado = await this.cliente.sesion.updateMany({
      where: {
        id_sesion: id,
        estado_sesion: 'PENDIENTE',
        fecha_creacion: { lte: limite },
      },
      data: { estado_sesion: 'EXPIRADA' },
    });
    return resultado.count === 1;
  }

  async cerrarConfirmadasTerminadas(ahora: Date): Promise<void> {
    await this.cliente.sesion.updateMany({
      where: { estado_sesion: 'CONFIRMADA', fin: { lte: ahora } },
      data: { estado_sesion: 'PENDIENTE_CIERRE' },
    });
  }

  buscarCierresVencidos(limite: Date) {
    return this.cliente.sesion.findMany({
      where: {
        estado_sesion: 'PENDIENTE_CIERRE',
        declaraciones: { some: { fecha_declaracion: { lte: limite } } },
      },
      select: { id_sesion: true },
    });
  }

  buscarConDeclaraciones(id: bigint) {
    return this.cliente.sesion.findUnique({
      where: { id_sesion: id },
      include: { declaraciones: true },
    });
  }
}
