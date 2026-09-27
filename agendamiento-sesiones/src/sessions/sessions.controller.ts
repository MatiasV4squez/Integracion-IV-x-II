import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/autenticacion-request';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('blocks')
  async createBlock(@Body() createBlockDto: CreateBlockDto) {
    return this.sessionsService.createBlock(createBlockDto);
  }

  @Post()
  async createSession(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.createSession(createSessionDto);
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  acceptSession(
    @Param('id', new ParseUUIDPipe()) idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sessionsService.acceptSession(idSesion, request.user.idUsuario);
  }
  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard)
  rejectSession(
    @Param('id', new ParseUUIDPipe()) idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sessionsService.rejectSession(idSesion, request.user.idUsuario);
  }
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelSession(
    @Param('id', new ParseUUIDPipe()) idSesion: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sessionsService.cancelSession(idSesion, request.user.idUsuario);
  }
}
