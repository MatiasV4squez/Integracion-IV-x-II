import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { runSerializable } from '../database/serializable-transaction';
import { BlockReservationsService } from '../integrations/materias-tutores/block-reservations.service';
import { type ReservedSchedule } from '../integrations/materias-tutores/blocks.gateway';
import {
  type Prisma,
  type sesion,
  type sesion_estado_sesion_enum,
} from '../generated/prisma/client';
import { CreateSessionDto } from './dto/create-session.dto';
import {
  OCCUPYING_STATES,
  parseIdentifier,
  toSessionResponse,
  validateParticipant,
  validateState,
  validateTutor,
} from './session.rules';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reservations: BlockReservationsService,
  ) {}

  async createSession(dto: CreateSessionDto) {
    const ids = {
      id_tutor: parseIdentifier(dto.id_tutor, 'id_tutor'),
      id_tutee: parseIdentifier(dto.id_tutee, 'id_tutee'),
      id_materia: parseIdentifier(dto.id_materia, 'id_materia'),
      id_bloque: parseIdentifier(dto.id_bloque, 'id_bloque'),
    };
    const reservation = await this.reservations.prepare({
      id_tutor: ids.id_tutor,
      id_materia: ids.id_materia,
      id_bloque: ids.id_bloque,
    });
    try {
      // HTTP fuera de la transacción. El diario permite compensar tras una caída.
      const schedule = await this.reservations.reserve(reservation);
      const session = await runSerializable(this.prisma, async (tx) => {
        await this.reservations.associate(tx, reservation.id);
        await this.ensurePendingLimit(tx, ids.id_tutee);
        await this.ensureNoOverlap(tx, schedule, {
          OR: [{ id_tutor: ids.id_tutor }, { id_tutee: ids.id_tutee }],
        });
        return tx.sesion.create({
          data: { ...ids, ...schedule, id_reserva: reservation.id },
        });
      });
      return this.response(session);
    } catch (error: unknown) {
      try {
        await this.reservations.compensate(reservation.id);
      } catch {
        // El diario persistente permite recuperar incluso una caída de PostgreSQL.
        this.logger.error(
          `Compensación pendiente de la reserva ${reservation.id}.`,
        );
      }
      throw error;
    }
  }

  async acceptSession(idSesion: string, idUsuario: string) {
    const id = parseIdentifier(idSesion, 'id_sesion');
    const userId = parseIdentifier(idUsuario, 'id_usuario');
    const updated = await runSerializable(this.prisma, async (tx) => {
      const session = await this.findSessionOrFail(tx, id);
      validateTutor(session, userId);
      validateState(session, 'PENDIENTE');
      await this.ensureNoOverlap(tx, session, {
        id_sesion: { not: id },
        OR: [{ id_tutor: session.id_tutor }, { id_tutee: session.id_tutee }],
      });
      // El contrato conserva la reserva y su horario hasta una liberación explícita.
      return this.transitionSession(tx, session, 'CONFIRMADA');
    });
    return this.response(updated);
  }

  async rejectSession(idSesion: string, idUsuario: string) {
    const id = parseIdentifier(idSesion, 'id_sesion');
    const userId = parseIdentifier(idUsuario, 'id_usuario');
    const updated = await runSerializable(this.prisma, async (tx) => {
      const session = await this.findSessionOrFail(tx, id);
      validateTutor(session, userId);
      validateState(session, 'PENDIENTE');
      const result = await this.transitionSession(tx, session, 'RECHAZADA');
      await this.reservations.scheduleRelease(tx, session.id_reserva);
      return result;
    });
    return this.releaseAndRespond(updated);
  }

  async cancelSession(idSesion: string, idUsuario: string) {
    const id = parseIdentifier(idSesion, 'id_sesion');
    const userId = parseIdentifier(idUsuario, 'id_usuario');
    const updated = await runSerializable(this.prisma, async (tx) => {
      const session = await this.findSessionOrFail(tx, id);
      validateParticipant(session, userId);
      validateState(session, 'CONFIRMADA');
      await this.ensureBeforeStart(tx, session.inicio);
      const result = await this.transitionSession(tx, session, 'CANCELADA');
      await this.reservations.scheduleRelease(tx, session.id_reserva);
      return result;
    });
    return this.releaseAndRespond(updated);
  }

  @Cron(CronExpression.EVERY_HOUR, { waitForCompletion: true })
  async handleExpiredSessions() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pending = await this.prisma.sesion.findMany({
      where: { estado_sesion: 'PENDIENTE', fecha_creacion: { lte: cutoff } },
    });
    for (const session of pending) {
      try {
        const expired = await runSerializable(this.prisma, async (tx) => {
          const result = await tx.sesion.updateMany({
            where: {
              id_sesion: session.id_sesion,
              estado_sesion: 'PENDIENTE',
              fecha_creacion: { lte: cutoff },
            },
            data: { estado_sesion: 'EXPIRADA' },
          });
          if (result.count)
            await this.reservations.scheduleRelease(tx, session.id_reserva);
          return result.count;
        });
        if (expired) await this.reservations.tryRelease(session.id_reserva);
      } catch {
        this.logger.error(
          `No se pudo completar la expiración de ${session.id_sesion}; se reintentará.`,
        );
      }
    }
  }

  private async findSessionOrFail(tx: Prisma.TransactionClient, id: bigint) {
    const session = await tx.sesion.findUnique({ where: { id_sesion: id } });
    if (!session) throw new NotFoundException('La sesión no existe.');
    return session;
  }

  private async ensurePendingLimit(tx: Prisma.TransactionClient, id: bigint) {
    const pending = await tx.sesion.count({
      where: { id_tutee: id, estado_sesion: 'PENDIENTE' },
    });
    if (pending >= 4)
      throw new BadRequestException(
        'El estudiante ya posee el límite de 4 solicitudes pendientes.',
      );
  }

  private async ensureNoOverlap(
    tx: Prisma.TransactionClient,
    schedule: ReservedSchedule,
    filter: Prisma.sesionWhereInput,
  ) {
    const overlap = await tx.sesion.findFirst({
      where: {
        ...filter,
        estado_sesion: { in: OCCUPYING_STATES },
        inicio: { lt: schedule.fin },
        fin: { gt: schedule.inicio },
      },
      select: { id_sesion: true },
    });
    if (overlap)
      throw new ConflictException('Otra solicitud o sesión ocupa ese horario.');
  }

  private async ensureBeforeStart(tx: Prisma.TransactionClient, start: Date) {
    const [result] = await tx.$queryRaw<Array<{ started: boolean }>>`
      SELECT clock_timestamp() >= ${start}::timestamptz AS started
    `;
    if (result.started)
      throw new ConflictException(
        'La sesión ya comenzó; no se puede cancelar.',
      );
  }

  private async transitionSession(
    tx: Prisma.TransactionClient,
    session: sesion,
    next: sesion_estado_sesion_enum,
  ) {
    const result = await tx.sesion.updateMany({
      where: {
        id_sesion: session.id_sesion,
        estado_sesion: session.estado_sesion,
      },
      data: { estado_sesion: next },
    });
    if (result.count !== 1)
      throw new ConflictException(
        'La sesión cambió de estado. Actualiza e intenta nuevamente.',
      );
    return tx.sesion.findUniqueOrThrow({
      where: { id_sesion: session.id_sesion },
    });
  }

  private async releaseAndRespond(session: sesion) {
    try {
      await this.reservations.tryRelease(session.id_reserva);
    } catch {
      this.logger.error(
        `Liberación pendiente de la reserva ${session.id_reserva}.`,
      );
    }
    return this.response(session);
  }

  private async response(session: sesion) {
    const reservation = await this.prisma.reserva_bloque.findUniqueOrThrow({
      where: { id: session.id_reserva },
      select: { estado: true },
    });
    const states = {
      ASOCIADA: 'RESERVADA',
      LIBERADA: 'LIBERADA',
      LIBERAR: 'LIBERACION_PENDIENTE',
      PREPARADA: 'LIBERACION_PENDIENTE',
    } as const;
    return {
      ...toSessionResponse(session),
      estado_reserva: states[reservation.estado],
    };
  }
}
