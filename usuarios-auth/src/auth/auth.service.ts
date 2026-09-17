import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PasswordService } from './password.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly passwords: PasswordService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuarios.buscarPorCorreo(
      dto.correo_institucional,
    );
    if (
      !usuario ||
      !(await this.passwords.verificar(usuario.password_hash, dto.password))
    ) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    return {
      usuario: this.usuarios.datosPublicos(usuario),
      mensaje: 'Credenciales válidas.',
    };
  }
}
