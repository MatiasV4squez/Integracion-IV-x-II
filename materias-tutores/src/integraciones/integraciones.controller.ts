import { timingSafeEqual } from 'node:crypto';
import { BadRequestException, ConflictException, Controller, Headers, Param, Patch, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { leerIdPositivo } from '../postulaciones/postulaciones.dto.js';
import { IntegracionesService } from './integraciones.service.js';

@ApiTags('Integraciones internas')
@ApiHeader({ name: 'X-Integracion-Secret', required: true })
@Controller('integraciones')
export class IntegracionesController {
  constructor(
    private readonly servicio: IntegracionesService,
    private readonly config: ConfigService,
  ) {}

  private validarIntegracion(clave: string | undefined): void {
    const esperada = this.config.get<string>('INTEGRACION_SECRET');
    if (!esperada || !clave)
      throw new UnauthorizedException('Integración no autorizada');
    const recibido = Buffer.from(clave);
    const secreto = Buffer.from(esperada);
    if (
      recibido.length !== secreto.length ||
      !timingSafeEqual(recibido, secreto)
    ) {
      throw new UnauthorizedException('Integración no autorizada');
    }
  }

  @Patch('bloques/:idBloque/estado')
  @ApiOperation({
    summary:
      'Reservar o liberar un bloque según el estado de la sesión en Agendamiento',
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
  cambiarEstadoBloque(
    @Headers('x-integracion-secret') clave: string | undefined,
    @Param('idBloque') idTexto: string,
    @Body() cuerpo: unknown,
  ) {
    this.validarIntegracion(clave);
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo))
      throw new BadRequestException('Cuerpo inválido');
    const datos = cuerpo as Record<string, unknown>;
    if (
      Object.keys(datos).length !== 1 ||
      !['DISPONIBLE', 'RESERVADO'].includes(String(datos.estado))
    ) {
      throw new BadRequestException('estado debe ser DISPONIBLE o RESERVADO');
    }
    return this.servicio.cambiarEstadoBloque(
      leerIdPositivo(idTexto, 'idBloque'),
      datos.estado as 'DISPONIBLE' | 'RESERVADO',
    );
  }

  @Post('tutores/:idTutor/calificaciones')
  @ApiOperation({
    summary: 'Registrar una calificación recibida por el usuario como tutor',
  })
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
  registrarCalificacion(
    @Headers('x-integracion-secret') clave: string | undefined,
    @Param('idTutor') idTexto: string,
    @Body() cuerpo: unknown,
  ) {
    this.validarIntegracion(clave);
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo))
      throw new BadRequestException('Cuerpo inválido');
    const datos = cuerpo as Record<string, unknown>;
    if (
      Object.keys(datos).some(
        (campo) =>
          !['idCalificacion', 'puntuacion', 'rolEvaluado'].includes(campo),
      ) ||
      Object.keys(datos).length !== 3
    ) {
      throw new BadRequestException('Campos de calificación inválidos');
    }
    if (datos.rolEvaluado !== 'TUTOR')
      throw new ConflictException('Solo se contabilizan evaluaciones al tutor');
    if (
      !Number.isInteger(datos.puntuacion) ||
      Number(datos.puntuacion) < 1 ||
      Number(datos.puntuacion) > 5
    ) {
      throw new BadRequestException('puntuacion debe estar entre 1 y 5');
    }
    if (typeof datos.idCalificacion !== 'string')
      throw new BadRequestException('idCalificacion debe enviarse como texto');
    return this.servicio.registrarCalificacion(
      leerIdPositivo(idTexto, 'idTutor'),
      leerIdPositivo(datos.idCalificacion, 'idCalificacion'),
      Number(datos.puntuacion),
    );
  }
}
