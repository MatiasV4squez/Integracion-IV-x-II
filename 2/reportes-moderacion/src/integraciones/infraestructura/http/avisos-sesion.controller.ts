import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { RegistrarAvisoSesionUseCase } from '../../aplicacion/registrar-aviso-sesion.use-case.js';
import {
  TIPO_CONFLICTO_DETECTADO,
  TIPO_CONFLICTO_RESUELTO,
} from '../../dominio/aviso-sesion.js';
import { AvisoConflictoDto } from './dto/aviso-conflicto.dto.js';
import { AvisoResolucionDto } from './dto/aviso-resolucion.dto.js';
import { IntegracionSecretGuard } from './integracion-secret.guard.js';

@Controller('integraciones/sesiones')
@UseGuards(IntegracionSecretGuard)
export class AvisosSesionController {
  constructor(private readonly registrarAviso: RegistrarAvisoSesionUseCase) {}

  @Post('conflictos')
  @HttpCode(200)
  conflicto(@Body() aviso: AvisoConflictoDto) {
    return this.registrarAviso.ejecutar(aviso, TIPO_CONFLICTO_DETECTADO);
  }

  @Post('resoluciones')
  @HttpCode(200)
  resolucion(@Body() aviso: AvisoResolucionDto) {
    return this.registrarAviso.ejecutar(aviso, TIPO_CONFLICTO_RESUELTO);
  }
}
