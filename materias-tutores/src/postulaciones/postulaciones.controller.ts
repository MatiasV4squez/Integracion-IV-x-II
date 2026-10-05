import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthenticatedJwtGuard, type AuthenticatedRequest } from '../auth/authenticated-jwt.guard.js';
import { type ArchivoCertificado, leerIdPositivo, validarRevision } from './postulaciones.dto.js';
import { PostulacionesService } from './postulaciones.service.js';
import { PostulacionRespuestaDto } from './postulacion-respuesta.dto.js';

function esAdministrador(peticion: AuthenticatedRequest): boolean {
  return peticion.roles.some((rol) =>
    ['ADMINISTRADOR', 'ADMIN'].includes(rol.trim().toUpperCase()),
  );
}

function exigirAdministrador(peticion: AuthenticatedRequest): void {
  if (!esAdministrador(peticion)) {
    throw new ForbiddenException('Se requiere el rol de administrador');
  }
}

@ApiTags('Postulaciones')
@ApiBearerAuth()
@UseGuards(AuthenticatedJwtGuard)
@Controller('postulaciones')
export class PostulacionesController {
  constructor(private readonly postulaciones: PostulacionesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('certificado', {
      limits: { fileSize: 5_000_000, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['idMateria', 'certificado'],
      properties: {
        idMateria: { type: 'string', example: '1' },
        certificado: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Postular a una materia con certificado PDF o PNG' })
  @ApiCreatedResponse({ type: PostulacionRespuestaDto })
  postular(
    @Req() peticion: AuthenticatedRequest,
    @Body('idMateria') idMateria: string,
    @UploadedFile() certificado: ArchivoCertificado,
  ) {
    if (typeof idMateria !== 'string')
      throw new BadRequestException('idMateria es obligatorio');
    return this.postulaciones.postular(
      peticion.idUsuario,
      leerIdPositivo(idMateria, 'idMateria'),
      certificado,
    );
  }

  @Get('mias')
  @ApiOperation({ summary: 'Consultar las postulaciones propias' })
  @ApiOkResponse({ type: PostulacionRespuestaDto, isArray: true })
  consultarPropias(@Req() peticion: AuthenticatedRequest) {
    return this.postulaciones.consultarPropias(peticion.idUsuario);
  }

  @Get('pendientes')
  @ApiOperation({
    summary: 'Listar postulaciones pendientes para administración',
  })
  @ApiOkResponse({ type: PostulacionRespuestaDto, isArray: true })
  listarPendientes(@Req() peticion: AuthenticatedRequest) {
    exigirAdministrador(peticion);
    return this.postulaciones.listarPendientes();
  }

  @Get(':idPostulacion/certificado')
  @ApiOperation({ summary: 'Descargar el certificado de una postulación' })
  async descargarCertificado(
    @Req() peticion: AuthenticatedRequest,
    @Param('idPostulacion') idTexto: string,
    @Res() respuesta: Response,
  ) {
    const idPostulacion = leerIdPositivo(idTexto, 'idPostulacion');
    const archivo = await this.postulaciones.obtenerCertificado(
      idPostulacion,
      esAdministrador(peticion) ? null : peticion.idUsuario,
    );
    respuesta.setHeader(
      'Content-Disposition',
      `attachment; filename="certificado.${archivo.tipo === 'application/pdf' ? 'pdf' : 'png'}"`,
    );
    respuesta.setHeader('X-Content-Type-Options', 'nosniff');
    respuesta.type(archivo.tipo).send(archivo.contenido);
  }

  @Patch(':idPostulacion/aprobar')
  @ApiOperation({
    summary: 'Aprobar con nota acreditada mínima de 5.0 y asignar rol TUTOR',
  })
  @ApiOkResponse({ type: PostulacionRespuestaDto })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['notaAcreditada'],
      additionalProperties: false,
      properties: {
        notaAcreditada: {
          type: 'number',
          minimum: 5,
          maximum: 7,
          multipleOf: 0.1,
          example: 5.5,
        },
      },
    },
  })
  aprobar(
    @Req() peticion: AuthenticatedRequest,
    @Param('idPostulacion') idTexto: string,
    @Body() cuerpo: unknown,
  ) {
    exigirAdministrador(peticion);
    const revision = validarRevision(cuerpo, 'aprobar');
    return this.postulaciones.aprobar(
      leerIdPositivo(idTexto, 'idPostulacion'),
      peticion.idUsuario,
      revision.notaAcreditada!,
    );
  }

  @Patch(':idPostulacion/rechazar')
  @ApiOperation({ summary: 'Rechazar una postulación pendiente con motivo' })
  @ApiOkResponse({ type: PostulacionRespuestaDto })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['motivoRechazo'],
      additionalProperties: false,
      properties: {
        motivoRechazo: {
          type: 'string',
          minLength: 3,
          maxLength: 500,
          example: 'Certificado ilegible',
        },
      },
    },
  })
  rechazar(
    @Req() peticion: AuthenticatedRequest,
    @Param('idPostulacion') idTexto: string,
    @Body() cuerpo: unknown,
  ) {
    exigirAdministrador(peticion);
    const revision = validarRevision(cuerpo, 'rechazar');
    return this.postulaciones.rechazar(
      leerIdPositivo(idTexto, 'idPostulacion'),
      peticion.idUsuario,
      revision.motivoRechazo!,
    );
  }

  @Post(':idPostulacion/reintentar-rol')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar una asignación de rol TUTOR pendiente' })
  @ApiOkResponse({ type: PostulacionRespuestaDto })
  reintentarRol(
    @Req() peticion: AuthenticatedRequest,
    @Param('idPostulacion') idTexto: string,
  ) {
    exigirAdministrador(peticion);
    return this.postulaciones.reintentarAsignacion(
      leerIdPositivo(idTexto, 'idPostulacion'),
    );
  }
}
