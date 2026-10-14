import {
  Body,
  Controller,
  Param,
  Patch,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { createValidationPipe } from '../../../config/validation.pipe';
import { CambiarEstadoCuentaDto } from './dto/cambiar-estado-cuenta.dto';
import { InternalServiceGuard } from './internal-service.guard';
import { ModeracionCuentasService } from '../../aplicacion/moderacion-cuentas.service';

@Controller('internal/usuarios')
@UseGuards(InternalServiceGuard)
@UsePipes(createValidationPipe())
export class InternalModeracionController {
  constructor(private readonly cuentas: ModeracionCuentasService) {}

  @Patch(':id/estado-cuenta')
  cambiarEstado(@Param('id') id: string, @Body() dto: CambiarEstadoCuentaDto) {
    return this.cuentas.cambiarEstado(id, dto.estado);
  }
}
