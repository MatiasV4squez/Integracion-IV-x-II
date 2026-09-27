import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { isTransactionConflict } from '../database/transaction-conflict';
import {
  Prisma,
  type bloque_horario,
  type sesion,
  type sesion_estado_sesion_enum,
} from '../generated/prisma/client';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import {
  OCCUPYING_STATES,
  parseBlockTime,
  parseUserId,
  toSessionResponse,
  validateBlock,
  validateParticipant,
  validateState,
  validateTutor,
} from './session.rules';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly timeZone: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.timeZone =
      config.get<string>('SESSION_TIME_ZONE') ?? 'America/Santiago';
    // Fallar al iniciar si la zona está mal configurada.
    new Intl.DateTimeFormat('en', { timeZone: this.timeZone }).format();
  }

  async createBlock(dto: CreateBlockDto) {
    const start = parseBlockTime(dto.hora_inicio);
    const end = parseBlockTime(dto.hora_fin);
    if (end <= start) {
      throw new BadRequestException(
        'hora_fin debe ser posterior a hora_inicio en el mismo día.',
      );
    }
    const block = await this.prisma.bloque_horario.create({
      data: {
        id_tutor: parseUserId(dto.id_tutor, 'id_tutor'),
        dia: new Date(`${dto.dia}T00:00:00.000Z`),
        hora_inicio: start,
        hora_fin: end,
      },
    });
    return { ...block, id_tutor: block.id_tutor.toString() };
  }

  async createSession(dto: CreateSessionDto) {
    const tutorId = parseUserId(dto.id_tutor, 'id_tutor');
    const tuteeId = parseUserId(dto.id_tutee, 'id_tutee');
    return this.runSerializableTransaction(async (tx) => {
      const block = await tx.bloque_horario.findUnique({
        where: { id_bloque: dto.id_bloque },
      });
      if (!block)
        throw new NotFoundException(
          'El bloque horario especificado no existe.',
        );
      validateBlock(block, tutorId);
      if (block.estado_bloque !== 'DISPONIBLE') {
        throw new ConflictException('El bloque horario no está disponible.');
      }
      await this.ensurePendingLimit(tx, tuteeId);
      await this.ensureNoOverlap(tx, block, {
        OR: [{ id_tutor: tutorId }, { id_tutee: tuteeId }],
      });
      const session = await tx.sesion.create({
        data: {
          ...dto,
          id_tutor: tutorId,
          id_tutee: tuteeId,
          estado_sesion: 'PENDIENTE',
        },
      });
      await this.reserveBlock(tx, block.id_bloque);
      return toSessionResponse(session);
    });
  }

  async acceptSession(idSesion: string, idUsuario: string) {
    const userId = parseUserId(idUsuario, 'id_usuario');
    return this.runSerializableTransaction(async (tx) => {
      const session = await this.findSessionOrFail(tx, idSesion);
      validateTutor(session, userId);
      validateState(session, 'PENDIENTE');
      validateBlock(session.bloque_horario, session.id_tutor);
      await this.ensureNoOverlap(tx, session.bloque_horario, {
        id_sesion: { not: idSesion },
        id_tutor: session.id_tutor,
      });
      const updated = await this.transitionSession(tx, session, 'CONFIRMADA');
      await this.reserveBlock(tx, session.id_bloque);
      return toSessionResponse(updated);
    });
  }

  async rejectSession(idSesion: string, idUsuario: string) {
    const userId = parseUserId(idUsuario, 'id_usuario');
    return this.runSerializableTransaction(async (tx) => {
      const session = await this.findSessionOrFail(tx, idSesion);
      validateTutor(session, userId);
      validateState(session, 'PENDIENTE');
      const updated = await this.transitionSession(tx, session, 'RECHAZADA');
      await this.releaseBlockIfUnused(tx, session.id_bloque);
      return toSessionResponse(updated);
    });
  }

  async cancelSession(idSesion: string, idUsuario: string) {
    const userId = parseUserId(idUsuario, 'id_usuario');
    return this.runSerializableTransaction(async (tx) => {
      const session = await this.findSessionOrFail(tx, idSesion);
      validateParticipant(session, userId);
      validateState(session, 'CONFIRMADA');
      await this.ensureBeforeStart(tx, session.bloque_horario);
      const updated = await this.transitionSession(tx, session, 'CANCELADA');
      await this.releaseBlockIfUnused(tx, session.id_bloque);
      return toSessionResponse(updated);
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredSessions() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pending = await this.prisma.sesion.findMany({
      where: { estado_sesion: 'PENDIENTE', fecha_creacion: { lte: cutoff } },
      select: { id_sesion: true, id_bloque: true },
    });
    let expired = 0;
    for (const session of pending) {
      expired += await this.expireSession(session, cutoff);
    }
    if (expired > 0)
      this.logger.log(`Se actualizaron ${expired} solicitudes a EXPIRADA.`);
  }

  private async expireSession(
    session: Pick<sesion, 'id_sesion' | 'id_bloque'>,
    cutoff: Date,
  ) {
    return this.runSerializableTransaction(async (tx) => {
      const result = await tx.sesion.updateMany({
        where: {
          id_sesion: session.id_sesion,
          estado_sesion: 'PENDIENTE',
          fecha_creacion: { lte: cutoff },
        },
        data: { estado_sesion: 'EXPIRADA' },
      });
      if (result.count) await this.releaseBlockIfUnused(tx, session.id_bloque);
      return result.count;
    });
  }

  private async findSessionOrFail(
    tx: Prisma.TransactionClient,
    idSesion: string,
  ) {
    const session = await tx.sesion.findUnique({
      where: { id_sesion: idSesion },
      include: { bloque_horario: true },
    });
    if (!session) throw new NotFoundException('La sesión no existe.');
    return session;
  }

  private async ensurePendingLimit(
    tx: Prisma.TransactionClient,
    tuteeId: bigint,
  ) {
    const pending = await tx.sesion.count({
      where: { id_tutee: tuteeId, estado_sesion: 'PENDIENTE' },
    });
    if (pending >= 4)
      throw new BadRequestException(
        'El estudiante ya posee el límite de 4 solicitudes pendientes.',
      );
  }

  private async ensureNoOverlap(
    tx: Prisma.TransactionClient,
    block: bloque_horario,
    filter: Prisma.sesionWhereInput,
  ) {
    const overlap = await tx.sesion.findFirst({
      where: {
        ...filter,
        estado_sesion: { in: OCCUPYING_STATES },
        bloque_horario: {
          dia: block.dia,
          hora_inicio: { lt: block.hora_fin },
          hora_fin: { gt: block.hora_inicio },
        },
      },
      select: { id_sesion: true },
    });
    if (overlap)
      throw new ConflictException('Otra solicitud o sesión ocupa ese horario.');
  }

  private async ensureBeforeStart(
    tx: Prisma.TransactionClient,
    block: bloque_horario,
  ) {
    const day = block.dia.toISOString().slice(0, 10);
    const time = block.hora_inicio.toISOString().slice(11, 23);
    // PostgreSQL resuelve la zona IANA y los cambios estacionales; no depende del TZ de Node.
    const [result] = await tx.$queryRaw<Array<{ started: boolean }>>`
      SELECT clock_timestamp() >=
        ((${day}::date + ${time}::time) AT TIME ZONE ${this.timeZone}) AS started
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

  private async reserveBlock(tx: Prisma.TransactionClient, idBloque: string) {
    await tx.bloque_horario.update({
      where: { id_bloque: idBloque },
      data: { estado_bloque: 'RESERVADO', updated_at: new Date() },
    });
  }

  private async releaseBlockIfUnused(
    tx: Prisma.TransactionClient,
    idBloque: string,
  ) {
    const occupied = await tx.sesion.count({
      where: { id_bloque: idBloque, estado_sesion: { in: OCCUPYING_STATES } },
    });
    if (occupied === 0) {
      await tx.bloque_horario.updateMany({
        where: { id_bloque: idBloque, estado_bloque: 'RESERVADO' },
        data: { estado_bloque: 'DISPONIBLE', updated_at: new Date() },
      });
    }
  }

  private async runSerializableTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: unknown) {
        if (!isTransactionConflict(error)) throw error;
        if (attempt < maxAttempts)
          await new Promise<void>((resolve) =>
            setTimeout(resolve, 50 * attempt),
          );
      }
    }
    throw new ConflictException(
      'Otra operación modificó los datos. Intenta nuevamente.',
    );
  }
}
