import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { RegistrarUsuarioUseCase } from './aplicacion/registrar-user.use-case';
import { AuthService } from '../auth/aplicacion/auth.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { LoginDto } from '../auth/infraestructura/http/dto/login.dto';
import { createValidationPipe } from '../config/validation.pipe';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly registrarUsuario: RegistrarUsuarioUseCase,
    private readonly auth: AuthService,
  ) {}

  @Post('registro')
  async crear(@Body() createUsuarioDto: CreateUsuarioDto) {
    const usuario = await this.registrarUsuario.ejecutar(createUsuarioDto);
    return {
      id: usuario.id_usuario?.toString(),
      nombre: usuario.nombre,
      correo: usuario.correo_institucional,
      estado: usuario.estado_cuenta,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createValidationPipe())
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.correo_institucional, dto.password);
  }
}
