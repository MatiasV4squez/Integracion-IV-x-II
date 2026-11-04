import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  BadRequestException,
  ConflictException,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RegistrarUsuarioUseCase } from '../../aplicacion/registrar-usuario.use-case';
import { CorreoDuplicadoError } from '../../dominio/correo-duplicado.error';
import { AuthService } from '../../../auth/aplicacion/auth.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { LoginDto } from '../../../auth/infraestructura/http/dto/login.dto';
import { createValidationPipe } from '../../../config/validation.pipe';
import { JwtAuthGuard } from '../../../auth/infraestructura/http/jwt-auth.guard';
import { ConsultarDatosPublicosUseCase } from '../../aplicacion/consultar-datos-publicos.use-case';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly registrarUsuario: RegistrarUsuarioUseCase,
    private readonly auth: AuthService,
    private readonly datosPublicos: ConsultarDatosPublicosUseCase,
  ) {}

  @Post('registro')
  async crear(@Body() createUsuarioDto: CreateUsuarioDto) {
    try {
      const usuario = await this.registrarUsuario.ejecutar({
        nombre: createUsuarioDto.nombre,
        correoInstitucional: createUsuarioDto.correo_institucional,
        password: createUsuarioDto.password_hash,
      });
      return {
        id: usuario.id_usuario?.toString(),
        nombre: usuario.nombre,
        correo: usuario.correo_institucional,
        estado: usuario.estado_cuenta,
      };
    } catch (error) {
      if (error instanceof CorreoDuplicadoError)
        throw new ConflictException(error.message);
      throw error;
    }
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
