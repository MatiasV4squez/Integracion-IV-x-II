import { Controller, Get, Param, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedJwtGuard } from '../../../auth/authenticated-jwt.guard.js';
import { ConsultarReputacionUseCase } from '../../application/consultar-reputacion.use-case.js';
import { ReputacionErrorFilter } from './reputacion-error.filter.js';
import { leerIdReputacion } from './dto/validar-calificacion.js';
import { ReputacionRespuestaDto } from './dto/reputacion-respuesta.dto.js';

@ApiTags('Tutores')
@ApiBearerAuth()
@UseGuards(AuthenticatedJwtGuard)
@UseFilters(ReputacionErrorFilter)
@Controller('tutores')
export class ReputacionController {
  constructor(private readonly consultar: ConsultarReputacionUseCase) {}

  @Get(':idTutor/reputacion')
  @ApiOperation({ summary: 'Consultar reputación global del tutor' })
  @ApiOkResponse({ type: ReputacionRespuestaDto })
  consultarReputacion(@Param('idTutor') idTexto: string) {
    return this.consultar.ejecutar(leerIdReputacion(idTexto, 'idTutor'));
  }
}
