import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { runSerializable } from '../database/serializable-transaction';
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

  constructor(private readonly prisma: PrismaService) {}

  createSession(dto: CreateSessionDto) {
    parseIdentifier(dto.id_tutor, 'id_tutor');
    parseIdentifier(dto.id_tutee, 'id_tutee');
    parseIdentifier(dto.id_materia, 'id_materia');
    parseIdentifier(dto.id_bloque, 'id_bloque');
    // Pendiente del equipo: obtener el horario y comprobar la reserva del bloque.
    // No persistir solicitudes con horarios inventados o disponibilidad sin validar.
    throw new ServiceUnavailableException(
      'La creación de solicitudes está pendiente de la conexión con bloques horarios.',
    );
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
      return this.transitionSession(tx, session, 'CONFIRMADA');
    });
    return toSessionResponse(updated);
  }

  async rejectSession(idSesion: string, idUsuario: string) {
    const id = parseIdentifier(idSesion, 'id_sesion');
    const userId = parseIdentifier(idUsuario, 'id_usuario');
    const updated = await runSerializable(this.prisma, async (tx) => {
      const session = await this.findSessionOrFail(tx, id);
      validateTutor(session, userId);
      validateState(session, 'PENDIENTE');
      const result = await this.transitionSession(tx, session, 'RECHAZADA');
      return result;
    });
    return toSessionResponse(updated);
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
      return result;
    });
    return toSessionResponse(updated);
  }

  @Cron(CronExpression.EVERY_HOUR, { waitForCompletion: true })
  async handleExpiredSessions() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pending = await this.prisma.sesion.findMany({
      where: { estado_sesion: 'PENDIENTE', fecha_creacion: { lte: cutoff } },
    });
    for (const session of pending) {
      try {
        await runSerializable(this.prisma, async (tx) => {
          const result = await tx.sesion.updateMany({
            where: {
              id_sesion: session.id_sesion,
              estado_sesion: 'PENDIENTE',
              fecha_creacion: { lte: cutoff },
            },
            data: { estado_sesion: 'EXPIRADA' },
          });
          return result.count;
        });
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

  private async ensureNoOverlap(
    tx: Prisma.TransactionClient,
    schedule: Pick<sesion, 'inicio' | 'fin'>,
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
}
