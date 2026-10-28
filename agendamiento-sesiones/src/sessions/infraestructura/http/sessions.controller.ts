import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../auth/autenticacion-request';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CalificarSesionDto } from './calificar-sesion.dto';
import { CreateSessionDto } from './create-session.dto';
import { SesionCreadaResponseDto } from './sesion-creada.response.dto';
import { DeclararCierreDto } from './declarar-cierre.dto';
import { ResolveConflictDto } from './resolve-conflict.dto';
import { GestionarSesiones } from '../../aplicacion/casos-de-uso/gestionar-sesiones';
import { ErrorSesionFilter } from './error-sesion.filter';
import { aRespuestaSesion, aRespuestaDeclaracion, aRespuestaCalificacion } from './respuestas-sesion';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseFilters(ErrorSesionFilter)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sesiones: GestionarSesiones) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Crear una nueva solicitud de sesión de tutoría',
    description:
      'Recibe exclusivamente id_tutor, id_materia e id_bloque como texto. El estudiante proviene del JWT y el horario del bloque disponible en materias-tutores.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sesión creada exitosamente en estado PENDIENTE.',
    type: SesionCreadaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Identificadores inválidos o campos no permitidos.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT ausente o inválido.' })
  @ApiResponse({
    status: 409,
    description:
      'Límite de pendientes, tutor no habilitado o bloque/horario no disponible.',
  })
  @ApiResponse({
    status: 404,
    description: 'El bloque dejó de existir al reservarlo.',
  })
  @ApiResponse({
    status: 503,
    description: 'Materias-tutores no disponible o integración sin configurar.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Fallo inesperado de persistencia; se intenta liberar la reserva confirmada.',
  })
  async crearSesion(
    @Body() entrada: CreateSessionDto,
    @Req() solicitud: AuthenticatedRequest,
  ) {
    return aRespuestaSesion(
      await this.sesiones.crearSesion(entrada, solicitud.user.idUsuario),
    );
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Consultar el historial de sesiones del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Listado del historial de sesiones.',
  })
  async consultarHistorial(@Req() request: AuthenticatedRequest) {
    const historial = await this.sesiones.consultarHistorial(
      request.user.idUsuario,
    );
    return historial.map((sesion) => ({
      ...aRespuestaSesion(sesion),
      calificaciones: sesion.calificaciones.map(aRespuestaCalificacion),
    }));
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Consultar las sesiones activas del estudiante autenticado',
    description:
      'La identidad proviene del JWT. Devuelve sesiones propias como estudiante en estados PENDIENTE, CONFIRMADA, PENDIENTE_CIERRE y EN_CONFLICTO, ordenadas por inicio e identificador ascendentes.',
  })
  @ApiResponse({ status: 200, description: 'Listado de sesiones activas; vacío si no hay coincidencias.' })
  @ApiResponse({ status: 401, description: 'Token JWT ausente, inválido o vencido.' })
  async consultarSesionesActivas(@Req() request: AuthenticatedRequest) {
    const sesiones = await this.sesiones.consultarSesionesActivas(
      request.user.idUsuario,
    );
    return sesiones.map(aRespuestaSesion);
  }

  @Get('tutors/:id/reputation')
  @ApiOperation({ summary: 'Obtener reputación de un tutor' })
  @ApiResponse({
    status: 200,
    description:
      'Métricas de calificación y reputación del tutor. Sin notas recibidas como tutor, el promedio es null y requiere_revision es false.',
  })
  async obtenerReputacionTutor(@Param('id') idTutor: string) {
    const reputacion = await this.sesiones.obtenerReputacionTutor(idTutor);
    return { ...reputacion, id_tutor: reputacion.id_tutor.toString() };
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Aceptar una solicitud de sesión' })
  @ApiResponse({ status: 200, description: 'Sesión aceptada exitosamente.' })
  async aceptarSesion(
    @Param('id') idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return aRespuestaSesion(
      await this.sesiones.aceptarSesion(idSesion, request.user.idUsuario),
    );
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Rechazar una solicitud de sesión' })
  @ApiResponse({ status: 200, description: 'Sesión rechazada exitosamente.' })
  async rechazarSesion(
    @Param('id') idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return aRespuestaSesion(
      await this.sesiones.rechazarSesion(idSesion, request.user.idUsuario),
    );
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancelar una sesión' })
  @ApiResponse({ status: 200, description: 'Sesión cancelada exitosamente.' })
  async cancelarSesion(
    @Param('id') idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return aRespuestaSesion(
      await this.sesiones.cancelarSesion(idSesion, request.user.idUsuario),
    );
  }

  @Post(':id/closure-declarations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Declarar el cierre de una sesión de tutoría' })
  @ApiResponse({
    status: 201,
    description: 'Declaración enviada exitosamente.',
  })
  async declararCierre(
    @Param('id') idSesion: string,
    @Body() declaracion: DeclararCierreDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const resultado = await this.sesiones.declararCierre(
      idSesion,
      request.user.idUsuario,
      declaracion,
    );
    return {
      sesion: aRespuestaSesion(resultado.sesion),
      declaracion: aRespuestaDeclaracion(resultado.declaracion),
    };
  }

  @Post(':id/ratings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Calificar una sesión finalizada' })
  @ApiResponse({
    status: 201,
    description: 'Calificación registrada exitosamente.',
  })
  async calificarSesion(
    @Param('id') idSesion: string,
    @Body() calificacion: CalificarSesionDto,
    @Req() solicitud: AuthenticatedRequest,
  ) {
    const resultado = await this.sesiones.calificarSesion(
      idSesion,
      solicitud.user.idUsuario,
      calificacion,
    );
    return {
      calificacion: aRespuestaCalificacion(resultado.calificacion),
      reputacion_tutor: {
        ...resultado.reputacion_tutor,
        id_tutor: resultado.reputacion_tutor.id_tutor.toString(),
      },
    };
  }

  @Patch(':id/resolve-conflict')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Resolución administrativa de conflictos en sesiones',
  })
  @ApiResponse({
    status: 200,
    description: 'Conflicto resuelto exitosamente por administración.',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo un administrador puede resolver conflictos.',
  })
  async resolverConflicto(
    @Param('id') idSesion: string,
    @Body() resolveConflictDto: ResolveConflictDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const esAdministrador = request.user.roles.some((rol) =>
      ['ADMINISTRADOR', 'ADMIN'].includes(rol.trim().toUpperCase()),
    );
    if (!esAdministrador) {
      throw new ForbiddenException(
        'Solo un administrador puede resolver conflictos.',
      );
    }

    const sesion = await this.sesiones.resolverConflicto(
      idSesion,
      resolveConflictDto,
      request.user.idUsuario,
    );
    return aRespuestaSesion(sesion);
  }
}
