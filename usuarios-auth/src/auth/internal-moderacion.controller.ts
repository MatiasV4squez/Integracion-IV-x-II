import {
  Body,
  Controller,
  Param,
  Patch,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { createValidationPipe } from '../config/validation.pipe';
import { CambiarEstadoCuentaDto } from './dto/cambiar-estado-cuenta.dto';
import { InternalServiceGuard } from './internal-service.guard';
import { ModeracionCuentasService } from './moderacion-cuentas.service';

@Controller('internal/usuarios')
@UseGuards(InternalServiceGuard)
@UsePipes(
  createValidationPipe({
    code: 'AUTH_MODERATION_REQUEST_INVALID',
    message: 'La solicitud de moderacion no es valida.',
  }),
)
export class InternalModeracionController {
  constructor(private readonly moderacion: ModeracionCuentasService) {}

  @Patch(':id/estado-cuenta')
  cambiarEstado(
    @Param('id') idUsuario: string,
    @Body() dto: CambiarEstadoCuentaDto,
  ) {
    return this.moderacion.cambiarEstado(idUsuario, dto);
  }
}
