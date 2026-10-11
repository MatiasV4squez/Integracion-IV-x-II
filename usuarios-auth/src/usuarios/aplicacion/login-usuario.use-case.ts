import { Injectable, Inject, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Usuario } from '../dominio/usuario';
import { USUARIO_REPOSITORY } from '../dominio/ports/usuario.repository';
import type { UsuarioRepository } from '../dominio/ports/usuario.repository';
import { verify } from 'argon2';

@Injectable()
export class LoginUsuarioUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async ejecutar(correo: string, passwordPlana: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.buscarPorCorreo(correo);
    
    // 1. Validar existencia y contraseña (usando argon2 directamente)
    if (!usuario || !(await verify(usuario.password_hash, passwordPlana))) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Correo o contraseña incorrectos.',
      });
    }

    // 2. Validar reglas de negocio directamente con la Entidad
    if (usuario.estado_cuenta === 'SUSPENDIDO') {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'AUTH_ACCOUNT_SUSPENDED',
        message: 'La cuenta se encuentra suspendida.',
      });
    }

    return usuario;
  }
}