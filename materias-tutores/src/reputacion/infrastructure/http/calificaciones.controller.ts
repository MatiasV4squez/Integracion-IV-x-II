import { Body, Controller, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IntegracionSecretGuard } from '../../../auth/integracion-secret.guard.js';
import { RegistrarCalificacionUseCase } from '../../application/registrar-calificacion.use-case.js';
import { ReputacionErrorFilter } from './reputacion-error.filter.js';
import { validarEventoCalificacion } from './dto/validar-calificacion.js';
import { ReputacionRespuestaDto } from './dto/reputacion-respuesta.dto.js';

@ApiTags('Integraciones internas')
@ApiHeader({ name: 'X-Integracion-Secret', required: true })
@UseGuards(IntegracionSecretGuard)
@UseFilters(ReputacionErrorFilter)
@Controller('integraciones/tutores')
export class CalificacionesController {
  constructor(private readonly registrar: RegistrarCalificacionUseCase) {}

  @Post(':idTutor/calificaciones')
  @ApiOperation({ summary: 'Registrar una calificación recibida como tutor y recalcular su reputación' })
  @ApiResponse({ status: 201, type: ReputacionRespuestaDto })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['idCalificacion', 'puntuacion', 'rolEvaluado'],
      additionalProperties: false,
      properties: {
        idCalificacion: { type: 'string', example: '42' },
        puntuacion: { type: 'integer', minimum: 1, maximum: 5 },
        rolEvaluado: { type: 'string', enum: ['TUTOR'] },
      },
    },
  })
  registrarCalificacion(@Param('idTutor') idTutor: string, @Body() cuerpo: unknown) {
    return this.registrar.ejecutar(validarEventoCalificacion(idTutor, cuerpo));
  }
}
