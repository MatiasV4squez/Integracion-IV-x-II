// Agustin Addon

import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Ruta PÚBLICA: No exige token para permitir el registro
  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  // Ruta PROTEGIDA: Solo usuarios logueados pueden ver la lista
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/perfil')
  actualizarPerfil(
    @Param('id') id: string, 
    @Body() updatePerfilDto: UpdatePerfilDto
  ) {
    return this.usuariosService.actualizarPerfil(id, updatePerfilDto);
  }
}
