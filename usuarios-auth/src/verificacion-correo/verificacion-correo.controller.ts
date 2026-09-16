// Agustin Addon

import { Controller, Get, Post, Body } from '@nestjs/common';
import { VerificacionCorreoService } from './verificacion-correo.service';
import { CreateVerificacionCorreoDto } from './dto/create-verificacion-correo.dto';

@Controller('verificacion-correo')
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