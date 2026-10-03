import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SessionsCronService {
  private readonly logger = new Logger(SessionsCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Se ejecuta automáticamente cada hora
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredPendingSessions() {
    this.logger.log('Ejecutando revisión de sesiones pendientes vencidas (48h)...');

    const hace48Horas = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const resultado = await this.prisma.sesion.updateMany({
      where: {
        estado_sesion: 'PENDIENTE' as any,
        fecha_solicitud: {
          lte: hace48Horas,
        },
      },
      data: {
        estado_sesion: 'CANCELADA' as any,
      },
    });

    if (resultado.count > 0) {
      this.logger.log(
        `Se auto-resolvieron/cancelaron ${resultado.count} sesiones pendientes de más de 48h.`,
      );
    }
  }
}