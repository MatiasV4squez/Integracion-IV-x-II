import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateBlockDto } from './dto/create-block.dto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

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
    const targetBlock = await this.prisma.bloque_horario.findUnique({
      where: { id_bloque: createSessionDto.id_bloque },
    });

    if (!targetBlock) {
      throw new NotFoundException('El bloque horario especificado no existe.');
    }

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

            const overlappingSession = await tx.sesion.findFirst({
              where: {
                id_tutee: createSessionDto.id_tutee,
                estado_sesion: {
                  in: ['PENDIENTE', 'ACEPTADA'] as any[],
                },
                bloque_horario: {
                  dia: targetBlock.dia,
                  hora_inicio: { lt: targetBlock.hora_fin },
                  hora_fin: { gt: targetBlock.hora_inicio },
                },
              },
            });

            if (overlappingSession) {
              throw new BadRequestException(
                'El estudiante ya tiene una sesión agendada o pendiente en un horario que se traslapa.',
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
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
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

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredSessions() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.prisma.sesion.updateMany({
      where: {
        estado_sesion: 'PENDIENTE' as any,
        created_at: {
          lt: twentyFourHoursAgo,
        },
      },
      data: {
        estado_sesion: 'EXPIRADA' as any,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Se actualizaron ${result.count} solicitudes pendientes a estado EXPIRADA.`);
    }
  }
}