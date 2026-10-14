import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { USUARIO_REPOSITORY } from '../../usuarios/dominio/ports/usuario.repository';
import type { UsuarioRepository } from '../../usuarios/dominio/ports/usuario.repository';
import {
  PASSWORD_VERIFIER,
  TOKEN_PROVIDER,
  type PasswordVerifier,
  type TokenProvider,
} from '../dominio/auth.ports';
import { SessionService } from './session.service';

export interface ResultadoLogin {
  usuario: {
    id_usuario: string;
    nombre: string;
    correo_institucional: string;
    estado_cuenta: string;
    correo_verificado: boolean;
    roles: string[];
  };
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  mensaje: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarios: Pick<UsuarioRepository, 'buscarPorCorreo'>,
    @Inject(PASSWORD_VERIFIER) private readonly contrasenas: PasswordVerifier,
    @Inject(TOKEN_PROVIDER) private readonly tokens: TokenProvider,
    private readonly sesiones: SessionService,
  ) {}

  async login(correo: string, password: string): Promise<ResultadoLogin> {
    const usuario = await this.usuarios.buscarPorCorreo(
      correo.trim().toLowerCase(),
    );
    if (
      !usuario ||
      !(await this.contrasenas.verificar(usuario.password_hash, password))
    ) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Correo o contraseña incorrectos.',
      });
    }
    if (usuario.estado_cuenta === 'SUSPENDIDO') {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'AUTH_ACCOUNT_SUSPENDED',
        message: 'La cuenta se encuentra suspendida.',
      });
    }
    if (usuario.estado_cuenta !== 'ACTIVO') {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'AUTH_ACCOUNT_INACTIVE',
        message: 'La cuenta no está activa.',
      });
    }
    if (usuario.id_usuario === null) {
      throw new Error('El usuario autenticado no tiene identificador.');
    }
    const token = await this.tokens.emitir({
      id_usuario: usuario.id_usuario.toString(),
      correo_institucional: usuario.correo_institucional,
      roles: usuario.roles,
    });
    const sesionCreada = await this.sesiones.crear({
      idUsuario: usuario.id_usuario,
      jti: token.jti,
      fechaExpiracion: token.fechaExpiracion,
    });
    if (!sesionCreada) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'AUTH_ACCOUNT_INACTIVE',
        message: 'La cuenta ya no está disponible para iniciar sesión.',
      });
    }
    return {
      usuario: {
        id_usuario: usuario.id_usuario.toString(),
        nombre: usuario.nombre,
        correo_institucional: usuario.correo_institucional,
        estado_cuenta: usuario.estado_cuenta,
        correo_verificado: usuario.correo_verificado,
        roles: usuario.roles,
      },
      access_token: token.valor,
      token_type: 'Bearer',
      expires_in: token.expiraEnSegundos,
      mensaje: 'Autenticación exitosa.',
    };
  }
}
