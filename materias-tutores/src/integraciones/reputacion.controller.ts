import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedJwtGuard } from '../auth/authenticated-jwt.guard.js';
import { leerIdPositivo } from '../postulaciones/postulaciones.dto.js';
import { IntegracionesService } from './integraciones.service.js';
import { ReputacionRespuestaDto } from './reputacion-respuesta.dto.js';

@ApiTags('Tutores')
@ApiBearerAuth()
@UseGuards(AuthenticatedJwtGuard)
@Controller('tutores')
export class ReputacionController {
  constructor(private readonly servicio: IntegracionesService) {}

  @Get(':idTutor/reputacion')
  @ApiOperation({ summary: 'Consultar reputación global del tutor' })
  @ApiOkResponse({ type: ReputacionRespuestaDto })
  consultarReputacion(@Param('idTutor') idTexto: string) {
    return this.servicio.consultarReputacion(
      leerIdPositivo(idTexto, 'idTutor'),
    );
  }
}
