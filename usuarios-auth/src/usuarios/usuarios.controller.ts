import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  BadRequestException,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RegistrarUsuarioUseCase } from './aplicacion/registrar-user.use-case';
import { AuthService } from '../auth/aplicacion/auth.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { LoginDto } from '../auth/infraestructura/http/dto/login.dto';
import { createValidationPipe } from '../config/validation.pipe';
import { JwtAuthGuard } from '../auth/infraestructura/http/jwt-auth.guard';
import { ConsultarDatosPublicosUseCase } from './aplicacion/consultar-datos-publicos.use-case';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly registrarUsuario: RegistrarUsuarioUseCase,
    private readonly auth: AuthService,
    private readonly datosPublicos: ConsultarDatosPublicosUseCase,
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

  @Get()
  @UseGuards(JwtAuthGuard)
  consultarLote(@Query('ids') ids: unknown) {
    return this.consultarDatos(typeof ids === 'string' ? ids.split(',') : []);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async consultarUno(@Param('id') id: string) {
    const [usuario] = await this.consultarDatos([id]);
    if (!usuario) throw new NotFoundException('El usuario no existe.');
    return usuario;
  }

  private async consultarDatos(ids: string[]) {
    const resultado = await this.datosPublicos.ejecutar(ids);
    if (resultado === 'IDS_INVALIDOS') {
      throw new BadRequestException(
        'Indique entre 1 y 100 IDs de texto positivos dentro del rango BIGINT.',
      );
    }
    return resultado;
  }
}
