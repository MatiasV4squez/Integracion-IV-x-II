import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  ActividadSesion,
  EstadoCuentaModerable,
  ModeracionCuentasRepository,
  NuevaSesion,
  ResultadoModeracion,
  SessionRepository,
} from '../../dominio/auth.ports';

@Injectable()
export class PrismaAuthRepository
  implements SessionRepository, ModeracionCuentasRepository
{
  constructor(private readonly prisma: PrismaService) {}

  crearSiCuentaActiva(sesion: NuevaSesion): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.bloquearCuentaActiva(tx, sesion.idUsuario))) {
        return false;
      }
      await tx.sesion.create({
        data: {
          id_usuario: sesion.idUsuario,
          jti: sesion.jti,
          fecha_expiracion: sesion.fechaExpiracion,
        },
      });
      return true;
    });
  }

  registrarActividad({
    idUsuario,
    jti,
    ahora,
    limiteInactividad,
  }: ActividadSesion): Promise<boolean> {
    const sesionNoRevocada = {
      id_usuario: idUsuario,
      jti,
      fecha_revocacion: null,
    };
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.bloquearCuentaActiva(tx, idUsuario))) {
        return false;
      }
      const actualizada = await tx.sesion.updateMany({
        where: {
          ...sesionNoRevocada,
          fecha_expiracion: { gt: ahora },
          ultima_actividad: { gt: limiteInactividad },
        },
        data: { ultima_actividad: ahora },
      });
      if (actualizada.count === 1) return true;
      await tx.sesion.updateMany({
        where: {
          ...sesionNoRevocada,
          OR: [
            { fecha_expiracion: { lte: ahora } },
            { ultima_actividad: { lte: limiteInactividad } },
          ],
        },
        data: { fecha_revocacion: ahora },
      });
      return false;
    });
  }

  async revocar(idUsuario: bigint, jti: string): Promise<void> {
    await this.prisma.sesion.updateMany({
      where: { id_usuario: idUsuario, jti, fecha_revocacion: null },
      data: { fecha_revocacion: new Date() },
    });
  }

  cambiarEstado(
    idUsuario: bigint,
    estado: EstadoCuentaModerable,
  ): Promise<ResultadoModeracion | null> {
    return this.prisma.$transaction(async (tx) => {
      const cuenta = await tx.usuario.updateMany({
        where: { id_usuario: idUsuario },
        data: { estado_cuenta: estado },
      });
      if (cuenta.count !== 1) return null;
      let sesionesRevocadas = 0;
      if (estado === 'SUSPENDIDO') {
        const resultado = await tx.sesion.updateMany({
          where: { id_usuario: idUsuario, fecha_revocacion: null },
          data: { fecha_revocacion: new Date() },
        });
        sesionesRevocadas = resultado.count;
      }
      return {
        id_usuario: idUsuario.toString(),
        estado_cuenta: estado,
        sesiones_revocadas: sesionesRevocadas,
      };
    });
  }

  private async bloquearCuentaActiva(
    tx: Prisma.TransactionClient,
    idUsuario: bigint,
  ): Promise<boolean> {
    // Login y suspensión toman el mismo bloqueo para impedir sesiones posteriores a la suspensión.
    const cuenta = await tx.usuario.updateMany({
      where: { id_usuario: idUsuario, estado_cuenta: 'ACTIVO' },
      data: { estado_cuenta: 'ACTIVO' },
    });
    return cuenta.count === 1;
  }
}
