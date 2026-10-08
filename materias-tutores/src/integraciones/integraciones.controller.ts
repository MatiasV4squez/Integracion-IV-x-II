import { BadRequestException, Controller, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { IntegracionSecretGuard } from '../auth/integracion-secret.guard.js';
import { ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { leerIdPositivo } from '../postulaciones/postulaciones.dto.js';
import { IntegracionesService } from './integraciones.service.js';

@ApiTags('Integraciones internas')
@ApiHeader({ name: 'X-Integracion-Secret', required: true })
@UseGuards(IntegracionSecretGuard)
@Controller('integraciones')
export class IntegracionesController {
  constructor(private readonly servicio: IntegracionesService) {}

  @Patch('bloques/:idBloque/estado')
  @ApiOperation({
    summary: 'Reservar o liberar un bloque de disponibilidad',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['estado'],
      additionalProperties: false,
      properties: {
        estado: { type: 'string', enum: ['DISPONIBLE', 'RESERVADO'] },
      },
    },
  })
  cambiarEstadoBloque(@Param('idBloque') idTexto: string, @Body() cuerpo: unknown) {
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) throw new BadRequestException('Cuerpo inválido');
    const datos = cuerpo as Record<string, unknown>;
    if (Object.keys(datos).length !== 1 || !['DISPONIBLE', 'RESERVADO'].includes(String(datos.estado))) {
      throw new BadRequestException('estado debe ser DISPONIBLE o RESERVADO');
    }
    return this.servicio.cambiarEstadoBloque(leerIdPositivo(idTexto, 'idBloque'), datos.estado as 'DISPONIBLE' | 'RESERVADO');
  }
}
