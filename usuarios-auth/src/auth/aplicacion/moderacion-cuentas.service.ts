import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MODERACION_CUENTAS_REPOSITORY,
  type EstadoCuentaModerable,
  type ModeracionCuentasRepository,
} from '../dominio/auth.ports';
import { usuarioIdValido } from '../dominio/usuario-id';

@Injectable()
export class ModeracionCuentasService {
  constructor(
    @Inject(MODERACION_CUENTAS_REPOSITORY)
    private readonly cuentas: ModeracionCuentasRepository,
  ) {}

  async cambiarEstado(idUsuario: string, estado: EstadoCuentaModerable) {
    if (!usuarioIdValido(idUsuario)) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'AUTH_USER_ID_INVALID',
        message: 'El identificador de usuario no es válido.',
      });
    }
    const resultado = await this.cuentas.cambiarEstado(
      BigInt(idUsuario),
      estado,
    );
    if (!resultado) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'AUTH_USER_NOT_FOUND',
        message: 'El usuario no existe.',
      });
    }
    return resultado;
  }
}
