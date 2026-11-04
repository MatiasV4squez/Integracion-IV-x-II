import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { VerificacionCorreoRepository } from '../../dominio/ports/verificacion-correo.repository';

@Injectable()
export class PrismaVerificacionCorreoRepository implements VerificacionCorreoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarUsuario(correo: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo_institucional: correo },
      select: {
        id_usuario: true,
        correo_institucional: true,
        correo_verificado: true,
      },
    });
    return usuario
      ? {
          idUsuario: usuario.id_usuario,
          correoInstitucional: usuario.correo_institucional,
          correoVerificado: usuario.correo_verificado,
        }
      : null;
  }

  async crear(idUsuario: bigint, tokenHash: string, fechaExpiracion: Date) {
    const verificacion = await this.prisma.verificacionCorreo.create({
      data: {
        id_usuario: idUsuario,
        token: tokenHash,
        fecha_expiracion: fechaExpiracion,
      },
      select: { id_verificacion: true },
    });
    return verificacion.id_verificacion;
  }

  async eliminar(idVerificacion: bigint): Promise<void> {
    await this.prisma.verificacionCorreo.delete({
      where: { id_verificacion: idVerificacion },
    });
  }

  async invalidarAnteriores(
    idUsuario: bigint,
    excepto: bigint,
    ahora: Date,
  ): Promise<void> {
    await this.prisma.verificacionCorreo.updateMany({
      where: {
        id_usuario: idUsuario,
        id_verificacion: { not: excepto },
        fecha_utilizacion: null,
      },
      data: { fecha_utilizacion: ahora },
    });
  }

  async buscarPorHash(tokenHash: string) {
    const verificacion = await this.prisma.verificacionCorreo.findUnique({
      where: { token: tokenHash },
      select: {
        id_verificacion: true,
        id_usuario: true,
        fecha_expiracion: true,
        fecha_utilizacion: true,
        usuario: { select: { correo_verificado: true } },
      },
    });
    return verificacion
      ? {
          idVerificacion: verificacion.id_verificacion,
          idUsuario: verificacion.id_usuario,
          fechaExpiracion: verificacion.fecha_expiracion,
          fechaUtilizacion: verificacion.fecha_utilizacion,
          correoVerificado: verificacion.usuario.correo_verificado,
        }
      : null;
  }

  confirmar(
    idVerificacion: bigint,
    idUsuario: bigint,
    ahora: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const utilizado = await tx.verificacionCorreo.updateMany({
        where: {
          id_verificacion: idVerificacion,
          fecha_utilizacion: null,
          fecha_expiracion: { gt: ahora },
        },
        data: { fecha_utilizacion: ahora },
      });
      if (utilizado.count !== 1) return false;
      await tx.usuario.update({
        where: { id_usuario: idUsuario },
        data: { correo_verificado: true },
      });
      await tx.usuario.updateMany({
        where: { id_usuario: idUsuario, estado_cuenta: 'INACTIVO' },
        data: { estado_cuenta: 'ACTIVO' },
      });
      return true;
    });
  }
}
