import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import {
  type Prisma,
  type reserva_bloque,
} from '../../generated/prisma/client';
import { BlocksGateway, type ReservationRequest } from './blocks.gateway';

@Injectable()
export class BlockReservationsService {
  private readonly logger = new Logger(BlockReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: BlocksGateway,
  ) {}

  async prepare(ids: Omit<ReservationRequest, 'id'>) {
    this.gateway.ensureConfigured();
    return this.prisma.reserva_bloque.create({
      data: { id: randomUUID(), ...ids },
    });
  }

  reserve(reservation: ReservationRequest) {
    return this.gateway.reserve(reservation);
  }

  async associate(tx: Prisma.TransactionClient, id: string): Promise<void> {
    const result = await tx.reserva_bloque.updateMany({
      where: {
        id,
        estado: 'PREPARADA',
        fecha_creacion: { gt: this.expirationCutoff() },
      },
      data: { estado: 'ASOCIADA' },
    });
    if (result.count !== 1)
      throw new ServiceUnavailableException(
        'La reserva venció antes de crear la sesión.',
      );
  }

  async scheduleRelease(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<void> {
    await tx.reserva_bloque.update({
      where: { id },
      data: { estado: 'LIBERAR', proximo_intento: new Date() },
    });
  }

  async compensate(id: string): Promise<void> {
    // Si un COMMIT tuvo resultado incierto, no liberar una reserva ya asociada.
    await this.prisma.reserva_bloque.updateMany({
      where: { id, estado: 'PREPARADA' },
      data: { estado: 'LIBERAR', proximo_intento: new Date() },
    });
    await this.tryRelease(id);
  }

  async tryRelease(id: string): Promise<void> {
    const reservation = await this.prisma.reserva_bloque.findUniqueOrThrow({
      where: { id },
    });
    if (reservation.estado !== 'LIBERAR') return;
    try {
      await this.gateway.release(reservation);
      await this.prisma.reserva_bloque.updateMany({
        where: { id, estado: 'LIBERAR' },
        data: { estado: 'LIBERADA' },
      });
    } catch {
      await this.deferRelease(reservation);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  async retryPendingReleases(): Promise<void> {
    // Recuperación tras caída entre la reserva remota y el COMMIT local.
    await this.prisma.reserva_bloque.updateMany({
      where: {
        estado: 'PREPARADA',
        fecha_creacion: { lte: this.expirationCutoff() },
      },
      data: { estado: 'LIBERAR', proximo_intento: new Date() },
    });
    const pending = await this.prisma.reserva_bloque.findMany({
      where: { estado: 'LIBERAR', proximo_intento: { lte: new Date() } },
      orderBy: { proximo_intento: 'asc' },
      take: 50,
    });
    for (const reservation of pending) {
      try {
        await this.tryRelease(reservation.id);
      } catch {
        this.logger.error(
          `No se pudo procesar la reserva ${reservation.id}; se reintentará.`,
        );
      }
    }
  }

  private expirationCutoff(): Date {
    return new Date(Date.now() - 60_000);
  }

  private async deferRelease(reservation: reserva_bloque): Promise<void> {
    const delay = Math.min(3600, 2 ** Math.min(reservation.intentos, 6) * 60);
    await this.prisma.reserva_bloque.updateMany({
      where: { id: reservation.id, estado: 'LIBERAR' },
      data: {
        intentos: { increment: 1 },
        proximo_intento: new Date(Date.now() + delay * 1000),
      },
    });
    this.logger.warn(
      `Liberación pendiente de la reserva ${reservation.id}; se reintentará.`,
    );
  }
}
