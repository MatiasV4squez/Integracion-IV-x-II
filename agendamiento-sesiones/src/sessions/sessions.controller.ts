import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/autenticacion-request';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async createSession(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.createSession(createSessionDto);
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
}
