import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsuarioRolService } from './usuario-rol.service';
import { CreateUsuarioRoleDto } from './dto/create-usuario-rol.dto';

@Controller('usuario-rol')
export class UsuarioRolController {
  constructor(private readonly usuarioRolService: UsuarioRolService) {}

  @Post()
  create(@Body() dto: CreateUsuarioRoleDto) {
    return this.usuarioRolService.create(dto);
  }

  @Get()
  findAll() {
    return this.usuarioRolService.findAll();
  }
}