// Agustin Addon

import { Injectable } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsuariosService {
  // Inyectamos nuestro puente de base de datos
  constructor(private prisma: PrismaService) {}

  // Función para guardar un usuario en PostgreSQL
  async create(createUsuarioDto: CreateUsuarioDto) {
    return this.prisma.usuario.create({
      data: {
        nombre: createUsuarioDto.nombre,
        correo_institucional: createUsuarioDto.correo_institucional,
        password_hash: createUsuarioDto.password_hash,
        estado_cuenta: 'ACTIVO',
        correo_verificado: false,
      },
    });
  }

  // Función para obtener todos los usuarios registrados
  async findAll() {
    return this.prisma.usuario.findMany();
  }
}