import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  registrar(
    idUsuario: string,
    jti: string,
    fechaExpiracion: Date,
  ): Promise<unknown> {
    return this.prisma.sesion.create({
      data: {
        id_usuario: BigInt(idUsuario),
        jti,
        fecha_expiracion: fechaExpiracion,
      },
    });
  }

  async registrarActividad(idUsuario: string, jti: string): Promise<boolean> {
    const ahora = new Date();
    const inactividadMaximaSegundos = this.config.getOrThrow<number>(
      'JWT_IDLE_TIMEOUT_SECONDS',
    );
    const actividadMinima = new Date(
      ahora.getTime() - inactividadMaximaSegundos * 1000,
    );
    const resultado = await this.prisma.sesion.updateMany({
      where: {
        id_usuario: BigInt(idUsuario),
        jti,
        fecha_expiracion: { gt: ahora },
        fecha_revocacion: null,
        ultima_actividad: { gt: actividadMinima },
        usuario: { estado_cuenta: { not: 'SUSPENDIDO' } },
      },
      data: { ultima_actividad: ahora },
    });
    return resultado.count === 1;
  }

  async revocar(idUsuario: string, jti: string): Promise<void> {
    await this.prisma.sesion.updateMany({
      where: {
        id_usuario: BigInt(idUsuario),
        jti,
        fecha_revocacion: null,
      },
      data: { fecha_revocacion: new Date() },
    });
  }
}
