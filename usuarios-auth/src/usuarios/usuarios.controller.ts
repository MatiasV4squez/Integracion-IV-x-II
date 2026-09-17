// Agustin Addon

import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Esta ruta escucha peticiones POST en http://localhost:3000/usuarios
  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  // Esta ruta escucha peticiones GET en http://localhost:3000/usuarios
  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }
}