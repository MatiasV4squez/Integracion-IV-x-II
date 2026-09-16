// Agustin Addon

import { Injectable } from '@nestjs/common';
import { CreateUsuarioRoleDto } from './dto/create-usuario-rol.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsuarioRolService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUsuarioRoleDto) {
    return this.prisma.usuarioRol.create({
      data: {
        id_usuario: BigInt(dto.id_usuario),
        id_rol: dto.id_rol,
      },
    });
  }

  async findAll() {
    return this.prisma.usuarioRol.findMany();
  }
}