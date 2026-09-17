// Agustin Addon

import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRolDto: CreateRoleDto) {
    return this.prisma.rol.create({
      data: { nombre: createRolDto.nombre },
    });
  }

  async findAll() {
    return this.prisma.rol.findMany();
  }
}