import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/autenticacion-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalificarSesionDto } from './dto/calificar-sesion.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { DeclararCierreDto } from './dto/declarar-cierre.dto';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva solicitud de sesión de tutoría' })
  @ApiResponse({
    status: 201,
    description: 'Sesión creada exitosamente en estado PENDIENTE.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Límite de solicitudes pendientes alcanzado o solapamiento de horarios.',
  })
  async createSession(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.createSession(createSessionDto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Consultar el historial de sesiones del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Listado del historial de sesiones.',
  })
  async getHistory(@Req() request: AuthenticatedRequest) {
    return this.sessionsService.getHistorialSesiones(request.user.idUsuario);
  }

  @Get('tutors/:id/reputation')
  @ApiOperation({ summary: 'Obtener reputación de un tutor' })
  @ApiResponse({
    status: 200,
    description: 'Métricas de calificación y reputación del tutor.',
  })
  obtenerReputacionTutor(@Param('id') idTutor: string) {
    return this.sessionsService.obtenerReputacionTutor(idTutor);
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Aceptar una solicitud de sesión' })
  @ApiResponse({ status: 200, description: 'Sesión aceptada exitosamente.' })
  acceptSession(
    @Param('id') idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sessionsService.acceptSession(idSesion, request.user.idUsuario);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Rechazar una solicitud de sesión' })
  @ApiResponse({ status: 200, description: 'Sesión rechazada exitosamente.' })
  rejectSession(
    @Param('id') idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sessionsService.rejectSession(idSesion, request.user.idUsuario);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancelar una sesión' })
  @ApiResponse({ status: 200, description: 'Sesión cancelada exitosamente.' })
  cancelSession(
    @Param('id') idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sessionsService.cancelSession(idSesion, request.user.idUsuario);
  }

  @Post(':id/closure-declarations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Declarar el cierre de una sesión de tutoría' })
  @ApiResponse({ status: 201, description: 'Declaración enviada exitosamente.' })
  declararCierre(
    @Param('id') idSesion: string,
    @Body() declaracion: DeclararCierreDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sessionsService.declararCierre(
      idSesion,
      request.user.idUsuario,
      declaracion,
    );
  }

  @Post(':id/ratings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Calificar una sesión finalizada' })
  @ApiResponse({ status: 201, description: 'Calificación registrada exitosamente.' })
  calificarSesion(
    @Param('id') idSesion: string,
    @Body() calificacion: CalificarSesionDto,
    @Req() solicitud: AuthenticatedRequest,
  ) {
    return this.sessionsService.calificarSesion(
      idSesion,
      solicitud.user.idUsuario,
      calificacion,
    );
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
  async resolveConflict(
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

    return this.sessionsService.resolveConflict(
      idSesion,
      resolveConflictDto,
      request.user.idUsuario,
    );
  }
}