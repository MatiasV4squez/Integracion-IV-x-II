import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { DeclararCierreDto } from './dto/declarar-cierre.dto';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';
import { CalificarSesionDto } from './dto/calificar-sesion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/autenticacion-request';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async createSession(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.createSession(createSessionDto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(@Req() request: AuthenticatedRequest) {
    return this.sessionsService.getHistorialSesiones(request.user.idUsuario);
  }

  @Get('tutors/:id/reputation')
  obtenerReputacionTutor(@Param('id') idTutor: string) {
    return this.sessionsService.obtenerReputacionTutor(idTutor);
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  acceptSession(
    @Param('id') idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sessionsService.acceptSession(idSesion, request.user.idUsuario);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard)
  rejectSession(
    @Param('id') idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sessionsService.rejectSession(idSesion, request.user.idUsuario);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelSession(
    @Param('id') idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sessionsService.cancelSession(idSesion, request.user.idUsuario);
  }

  @Post(':id/closure-declarations')
  @UseGuards(JwtAuthGuard)
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
