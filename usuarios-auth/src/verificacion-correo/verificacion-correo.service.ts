// Agustin Addon

import { Injectable } from '@nestjs/common';
import { CreateVerificacionCorreoDto } from './dto/create-verificacion-correo.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VerificacionCorreoService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVerificacionCorreoDto) {
    return this.prisma.verificacionCorreo.create({
      data: {
        id_usuario: BigInt(dto.id_usuario), // Convertimos el número a BigInt para Postgres
        token: dto.token,
        fecha_expiracion: new Date(dto.fecha_expiracion), // Convertimos el texto a Fecha
      },
    });
  }

  async findAll() {
    return this.prisma.verificacionCorreo.findMany();
  }
}