import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RegistrarUsuarioUseCase } from './aplicacion/registrar-user.use-case';
import { LoginUsuarioUseCase } from './aplicacion/login-usuario.use-case';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { LoginDto } from '../auth/dto/login.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly registrarUsuario: RegistrarUsuarioUseCase,
    private readonly loginUsuario: LoginUsuarioUseCase,
  ) {}

  @Post('registro')
  async crear(@Body() createUsuarioDto: CreateUsuarioDto) {
    const usuario = await this.registrarUsuario.ejecutar(createUsuarioDto);
    // En la respuesta, mapeamos a lo que el cliente espera ver (sin enviar la password)
    return {
      id: usuario.id_usuario?.toString(),
      nombre: usuario.nombre,
      correo: usuario.correo_institucional,
      estado: usuario.estado_cuenta
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const usuario = await this.loginUsuario.ejecutar(
      loginDto.correo_institucional, 
      loginDto.password
    );
    
    // Aquí el controlador debería encargarse de generar el Token JWT
    // Por ahora, solo retornamos los datos del usuario validado
    return {
      id: usuario.id_usuario?.toString(),
      nombre: usuario.nombre,
      correo: usuario.correo_institucional
    };
  }
}