import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CambiarEstadoCuentaDto } from './dto/cambiar-estado-cuenta.dto';

export interface ResultadoCambioEstadoCuenta {
  id_usuario: string;
  estado_cuenta: string;
}

@Injectable()
export class ModeracionCuentasService {
  constructor(private readonly prisma: PrismaService) {}

  async cambiarEstado(
    idUsuarioRecibido: string,
    dto: CambiarEstadoCuentaDto,
  ): Promise<ResultadoCambioEstadoCuenta> {
    const idUsuario = this.parseIdUsuario(idUsuarioRecibido);
    try {
      const usuario = await this.prisma.usuario.update({
        where: { id_usuario: idUsuario },
        data: { estado_cuenta: dto.estado },
        select: { id_usuario: true, estado_cuenta: true },
      });
      return {
        id_usuario: usuario.id_usuario.toString(),
        estado_cuenta: usuario.estado_cuenta,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'AUTH_USER_NOT_FOUND',
          message: 'El usuario objetivo no existe.',
        });
      }
      throw error;
    }
  }

  private parseIdUsuario(idUsuario: string): bigint {
    if (!/^\d+$/.test(idUsuario) || BigInt(idUsuario) <= 0n) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'AUTH_USER_ID_INVALID',
        message: 'El identificador de usuario no es valido.',
      });
    }
    return BigInt(idUsuario);
  }
}
