// Agustin Addon

import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { VerificacionCorreoService } from './verificacion-correo.service';
import { CreateVerificacionCorreoDto } from './dto/create-verificacion-correo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('verificacion-correo')
@UseGuards(JwtAuthGuard)
export class VerificacionCorreoController {
  constructor(private readonly verificacionCorreoService: VerificacionCorreoService) {}

  @Post()
  create(@Body() dto: CreateVerificacionCorreoDto) {
    return this.verificacionCorreoService.create(dto);
  }

  @Get()
  findAll() {
    return this.verificacionCorreoService.findAll();
  }
}
