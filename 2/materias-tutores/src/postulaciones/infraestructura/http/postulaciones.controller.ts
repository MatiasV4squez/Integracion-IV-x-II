import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, Res, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthenticatedJwtGuard, type AuthenticatedRequest } from '../../../auth/authenticated-jwt.guard.js';
import { type ArchivoCertificado, leerIdPositivo, validarRevision } from './dto/postulaciones.dto.js';
import { PostularTutorUseCase } from '../../aplicacion/postular-tutor.use-case.js';
import { ConsultarPostulacionesPropiasUseCase } from '../../aplicacion/consultar-postulaciones-propias.use-case.js';
import { ListarPostulacionesPendientesUseCase } from '../../aplicacion/listar-postulaciones-pendientes.use-case.js';
import { ObtenerCertificadoUseCase } from '../../aplicacion/obtener-certificado.use-case.js';
import { AprobarPostulacionUseCase } from '../../aplicacion/aprobar-postulacion.use-case.js';
import { RechazarPostulacionUseCase } from '../../aplicacion/rechazar-postulacion.use-case.js';
import { ReintentarAsignacionRolUseCase } from '../../aplicacion/reintentar-asignacion-rol.use-case.js';
import { presentarPostulacion } from './presentar-postulacion.js';
import { PostulacionesErrorFilter } from './postulaciones-error.filter.js';
import { PostulacionRespuestaDto } from './dto/postulacion-respuesta.dto.js';

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
@UseFilters(PostulacionesErrorFilter)
@Controller('postulaciones')
export class PostulacionesController {
  constructor(
    private readonly crear: PostularTutorUseCase,
    private readonly propias: ConsultarPostulacionesPropiasUseCase,
    private readonly pendientes: ListarPostulacionesPendientesUseCase,
    private readonly certificado: ObtenerCertificadoUseCase,
    private readonly aprobarPostulacion: AprobarPostulacionUseCase,
    private readonly rechazarPostulacion: RechazarPostulacionUseCase,
    private readonly reintentar: ReintentarAsignacionRolUseCase,
  ) {}

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
  async postular(
    @Req() peticion: AuthenticatedRequest,
    @Body('idMateria') idMateria: string,
    @UploadedFile() certificado: ArchivoCertificado | undefined,
  ) {
    if (typeof idMateria !== 'string')
      throw new BadRequestException('idMateria es obligatorio');
    return presentarPostulacion(await this.crear.ejecutar(
      peticion.idUsuario,
      leerIdPositivo(idMateria, 'idMateria'),
      certificado ? { nombre: certificado.originalname, tipoDeclarado: certificado.mimetype, tamano: certificado.size, contenido: certificado.buffer } : undefined,
    ));
  }

  @Get('mias')
  @ApiOperation({ summary: 'Consultar las postulaciones propias' })
  @ApiOkResponse({ type: PostulacionRespuestaDto, isArray: true })
  async consultarPropias(@Req() peticion: AuthenticatedRequest) {
    return (await this.propias.ejecutar(peticion.idUsuario)).map(presentarPostulacion);
  }

  @Get('pendientes')
  @ApiOperation({
    summary: 'Listar postulaciones pendientes para administración',
  })
  @ApiOkResponse({ type: PostulacionRespuestaDto, isArray: true })
  async listarPendientes(@Req() peticion: AuthenticatedRequest) {
    exigirAdministrador(peticion);
    return (await this.pendientes.ejecutar()).map(presentarPostulacion);
  }

  @Get(':idPostulacion/certificado')
  @ApiOperation({ summary: 'Descargar el certificado de una postulación' })
  async descargarCertificado(
    @Req() peticion: AuthenticatedRequest,
    @Param('idPostulacion') idTexto: string,
    @Res() respuesta: Response,
  ) {
    const idPostulacion = leerIdPositivo(idTexto, 'idPostulacion');
    const archivo = await this.certificado.ejecutar(
      idPostulacion,
      esAdministrador(peticion) ? null : peticion.idUsuario,
    );
    respuesta.setHeader(
      'Content-Disposition',
      `attachment; filename="certificado.${archivo.tipo === 'application/pdf' ? 'pdf' : 'png'}"`,
    );
    respuesta.setHeader('X-Content-Type-Options', 'nosniff');
    respuesta.type(archivo.tipo).send(Buffer.from(archivo.contenido));
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
  async aprobar(
    @Req() peticion: AuthenticatedRequest,
    @Param('idPostulacion') idTexto: string,
    @Body() cuerpo: unknown,
  ) {
    exigirAdministrador(peticion);
    const revision = validarRevision(cuerpo, 'aprobar');
    return presentarPostulacion(await this.aprobarPostulacion.ejecutar(
      leerIdPositivo(idTexto, 'idPostulacion'),
      peticion.idUsuario,
      revision.notaAcreditada!,
    ));
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
  async rechazar(
    @Req() peticion: AuthenticatedRequest,
    @Param('idPostulacion') idTexto: string,
    @Body() cuerpo: unknown,
  ) {
    exigirAdministrador(peticion);
    const revision = validarRevision(cuerpo, 'rechazar');
    return presentarPostulacion(await this.rechazarPostulacion.ejecutar(
      leerIdPositivo(idTexto, 'idPostulacion'),
      peticion.idUsuario,
      revision.motivoRechazo!,
    ));
  }

  @Post(':idPostulacion/reintentar-rol')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar una asignación de rol TUTOR pendiente' })
  @ApiOkResponse({ type: PostulacionRespuestaDto })
  async reintentarRol(
    @Req() peticion: AuthenticatedRequest,
    @Param('idPostulacion') idTexto: string,
  ) {
    exigirAdministrador(peticion);
    return presentarPostulacion(await this.reintentar.ejecutar(
      leerIdPositivo(idTexto, 'idPostulacion'),
    ));
  }
}
