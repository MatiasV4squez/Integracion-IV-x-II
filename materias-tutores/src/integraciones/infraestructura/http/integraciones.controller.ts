import { BadRequestException, Controller, Param, Patch, Body, UseFilters, UseGuards } from '@nestjs/common';
import { IntegracionSecretGuard } from '../../../auth/integracion-secret.guard.js';
import { ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { parsePositiveId } from '../../../auth/parse-positive-id.js';
import { CambiarEstadoBloqueUseCase } from '../../aplicacion/cambiar-estado-bloque.use-case.js';
import { IntegracionBloqueErrorFilter } from './integracion-bloque-error.filter.js';

@ApiTags('Integraciones internas')
@ApiHeader({ name: 'X-Integracion-Secret', required: true })
@UseGuards(IntegracionSecretGuard)
@UseFilters(IntegracionBloqueErrorFilter)
@Controller('integraciones')
export class IntegracionesController {
  constructor(private readonly cambiarEstado: CambiarEstadoBloqueUseCase) {}

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
  async cambiarEstadoBloque(@Param('idBloque') idTexto: string, @Body() cuerpo: unknown) {
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) throw new BadRequestException('Cuerpo inválido');
    const datos = cuerpo as Record<string, unknown>;
    if (Object.keys(datos).length !== 1 || !['DISPONIBLE', 'RESERVADO'].includes(String(datos.estado))) {
      throw new BadRequestException('estado debe ser DISPONIBLE o RESERVADO');
    }
    const idBloque = parsePositiveId(idTexto);
    if (idBloque === null) throw new BadRequestException('idBloque debe ser un entero positivo');
    const resultado = await this.cambiarEstado.ejecutar(idBloque, datos.estado as 'DISPONIBLE' | 'RESERVADO');
    return { idBloque: resultado.idBloque.toString(), estadoBloque: resultado.estadoBloque };
  }
}
