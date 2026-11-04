import {
  Body,
  BadRequestException,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
  ServiceUnavailableException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { createValidationPipe } from '../../../config/validation.pipe';
import { AsignarTutorUseCase } from '../../aplicacion/asignar-tutor.use-case';
import { AsignarRolDto } from './dto/asignar-rol.dto';
import { IntegracionSecretGuard } from './integracion-secret.guard';

@Controller('internal/usuarios')
@UseGuards(IntegracionSecretGuard)
@UsePipes(createValidationPipe())
export class InternalRolesController {
  constructor(private readonly asignarTutor: AsignarTutorUseCase) {}

  @Post('roles')
  @HttpCode(200)
  async asignar(@Body() dto: AsignarRolDto) {
    const resultado = await this.asignarTutor.ejecutar(dto.idUsuario);
    switch (resultado) {
      case 'ID_INVALIDO':
        throw new BadRequestException(
          'El identificador de usuario no es válido.',
        );
      case 'USUARIO_NO_ENCONTRADO':
        throw new NotFoundException('El usuario no existe.');
      case 'ROL_NO_CONFIGURADO':
        throw new ServiceUnavailableException(
          'El rol TUTOR no está configurado; aplique las migraciones pendientes.',
        );
    }
    return { idUsuario: dto.idUsuario, rol: 'TUTOR' };
  }
}
