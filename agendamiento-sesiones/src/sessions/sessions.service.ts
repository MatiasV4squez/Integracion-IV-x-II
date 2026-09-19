import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
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
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const pendingCount = await tx.sesion.count({
              where: {
                id_tutee: createSessionDto.id_tutee,
                estado_sesion: 'PENDIENTE' as any,
              },
            });

            if (pendingCount >= 4) {
              throw new BadRequestException(
                'El estudiante ya posee el límite de 4 solicitudes pendientes.',
              );
            }

            return await tx.sesion.create({
              data: {
                id_tutee: createSessionDto.id_tutee,
                id_tutor: createSessionDto.id_tutor,
                id_materia: createSessionDto.id_materia,
                id_bloque: createSessionDto.id_bloque,
                estado_sesion: 'PENDIENTE' as any,
              },
            });
          },
          {
            isolationLevel: 'Serializable' as any,
          },
        );
      } catch (error: any) {
        if (error instanceof BadRequestException) {
          throw error;
        }

        if (error?.code === 'P2034') {
          if (attempt === maxRetries) {
            throw new InternalServerErrorException(
              'No se pudo procesar la solicitud debido a alta concurrencia. Intente nuevamente.',
            );
          }
          await new Promise((res) => setTimeout(res, 50 * attempt));
          continue;
        }

        throw error;
      }
    }
  }
}