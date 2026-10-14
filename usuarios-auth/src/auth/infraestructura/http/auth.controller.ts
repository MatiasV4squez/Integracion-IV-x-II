import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { createValidationPipe } from '../../../config/validation.pipe';
import { LoginDto } from './dto/login.dto';
import { AuthService } from '../../aplicacion/auth.service';
import { SessionService } from '../../aplicacion/session.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sesiones: SessionService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createValidationPipe())
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.correo_institucional, dto.password);
  }

  @Get('sesion')
  @UseGuards(JwtAuthGuard)
  consultarSesion(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  logout(@Req() request: AuthenticatedRequest) {
    return this.sesiones.revocar(request.user.sub, request.user.jti);
  }
}
