import {
  BadRequestException,
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_VERIFICATION_SENDER } from './ports/email-verification.sender';
import type { EmailVerificationSender } from './ports/email-verification.sender';

const RESPUESTA_REENVIO = {
  mensaje: 'Si la cuenta existe y requiere verificación, se enviará un correo.',
};

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(EMAIL_VERIFICATION_SENDER)
    private readonly sender: EmailVerificationSender,
  ) {}

  async reenviar(correoInstitucional: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo_institucional: correoInstitucional },
      select: {
        id_usuario: true,
        correo_institucional: true,
        correo_verificado: true,
      },
    });

    if (!usuario || usuario.correo_verificado) return RESPUESTA_REENVIO;

    await this.solicitarVerificacion(
      usuario.id_usuario,
      usuario.correo_institucional,
    );
    return RESPUESTA_REENVIO;
  }

  async solicitarVerificacion(
    idUsuario: bigint,
    correoInstitucional: string,
  ): Promise<void> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const ttlMinutos = this.config.getOrThrow<number>(
      'EMAIL_VERIFICATION_TTL_MINUTES',
    );
    const fechaExpiracion = new Date(Date.now() + ttlMinutos * 60_000);
    const verificacion = await this.prisma.verificacionCorreo.create({
      data: {
        id_usuario: idUsuario,
        token: tokenHash,
        fecha_expiracion: fechaExpiracion,
      },
      select: { id_verificacion: true },
    });

    const url = new URL(
      this.config.getOrThrow<string>('EMAIL_VERIFICATION_URL'),
    );
    url.searchParams.set('token', token);

    try {
      await this.sender.enviar(correoInstitucional, url.toString());
    } catch {
      await this.prisma.verificacionCorreo.delete({
        where: { id_verificacion: verificacion.id_verificacion },
      });
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'No fue posible enviar el correo de verificación.',
      });
    }

    await this.prisma.verificacionCorreo.updateMany({
      where: {
        id_usuario: idUsuario,
        id_verificacion: { not: verificacion.id_verificacion },
        fecha_utilizacion: null,
      },
      data: { fecha_utilizacion: new Date() },
    });
  }

  async confirmar(token: string) {
    const verificacion = await this.prisma.verificacionCorreo.findUnique({
      where: { token: this.hashToken(token) },
      select: {
        id_verificacion: true,
        id_usuario: true,
        fecha_expiracion: true,
        fecha_utilizacion: true,
        usuario: { select: { correo_verificado: true } },
      },
    });

    if (!verificacion) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'EMAIL_VERIFICATION_TOKEN_INVALID',
        message: 'El enlace de verificación no es válido.',
      });
    }
    if (verificacion.fecha_utilizacion) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EMAIL_VERIFICATION_TOKEN_USED',
        message: 'El enlace de verificación ya fue utilizado.',
      });
    }
    if (verificacion.fecha_expiracion.getTime() <= Date.now()) {
      throw new GoneException({
        statusCode: 410,
        code: 'EMAIL_VERIFICATION_TOKEN_EXPIRED',
        message: 'El enlace de verificación expiró.',
      });
    }
    if (verificacion.usuario.correo_verificado) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'El correo ya se encuentra verificado.',
      });
    }

    const ahora = new Date();
    await this.prisma.$transaction(async (transaction) => {
      const utilizado = await transaction.verificacionCorreo.updateMany({
        where: {
          id_verificacion: verificacion.id_verificacion,
          fecha_utilizacion: null,
          fecha_expiracion: { gt: ahora },
        },
        data: { fecha_utilizacion: ahora },
      });
      if (utilizado.count !== 1) {
        throw new ConflictException({
          statusCode: 409,
          code: 'EMAIL_VERIFICATION_TOKEN_USED',
          message: 'El enlace de verificación ya no está disponible.',
        });
      }

      await transaction.usuario.update({
        where: { id_usuario: verificacion.id_usuario },
        data: { correo_verificado: true },
      });
      await transaction.usuario.updateMany({
        where: {
          id_usuario: verificacion.id_usuario,
          estado_cuenta: 'INACTIVO',
        },
        data: { estado_cuenta: 'ACTIVO' },
      });
    });

    return { mensaje: 'Correo verificado correctamente.' };
  }

  private hashToken(token: string): string {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('EMAIL_VERIFICATION_SECRET'),
    )
      .update(token)
      .digest('hex');
  }
}
