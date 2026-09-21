import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuarios.buscarPorCorreo(
      dto.correo_institucional,
    );
    if (
      !usuario ||
      !(await this.passwords.verificar(usuario.password_hash, dto.password))
    ) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Correo o contraseña incorrectos.',
      });
    }

    const usuarioPublico = this.usuarios.datosPublicos(usuario);
    const token = await this.tokens.emitir(usuarioPublico);

    return {
      usuario: usuarioPublico,
      access_token: token.valor,
      token_type: 'Bearer',
      expires_in: token.expiraEnSegundos,
      mensaje: 'Autenticación exitosa.',
    };
  }
}
