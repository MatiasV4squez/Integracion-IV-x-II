import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateBlockDto } from './dto/create-block.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBlock(createBlockDto: CreateBlockDto) {
    return this.prisma.bloque_horario.create({
      data: {
        id_tutor: createBlockDto.id_tutor,
        dia: new Date(createBlockDto.dia),
        hora_inicio: createBlockDto.hora_inicio,
        hora_fin: createBlockDto.hora_fin,
      },
    });
  }

  async createSession(createSessionDto: CreateSessionDto) {
    const pendingCount = await this.prisma.sesion.count({
      where: {
        id_tutee: createSessionDto.id_tutee,
        estado: 'PENDIENTE',
      },
    });

    if (pendingCount >= 4) {
      throw new BadRequestException(
        'El estudiante ya posee el límite de 4 solicitudes pendientes.',
      );
    }

    return this.prisma.sesion.create({
      data: {
        id_tutee: createSessionDto.id_tutee,
        id_tutor: createSessionDto.id_tutor,
        id_materia: createSessionDto.id_materia,
        id_bloque: createSessionDto.id_bloque,
        estado: 'PENDIENTE',
      },
    });
  }
}