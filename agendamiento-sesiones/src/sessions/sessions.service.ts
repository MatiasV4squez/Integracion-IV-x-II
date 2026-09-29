import {
  BadRequestException,
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
import { DeclararCierreDto } from './dto/declarar-cierre.dto';
import {
  OCCUPYING_STATES,
  parseIdentifier,
  toDeclarationResponse,
  toSessionResponse,
  ValidateTransition,
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

  async declararCierre(
    idSesion: string,
    idUsuario: string,
    dto: DeclararCierreDto,
  ) {
    const id = parseIdentifier(idSesion, 'id_sesion');
    const userId = parseIdentifier(idUsuario, 'id_usuario');
    const absentId = this.validateAbsence(dto);

    const result = await runSerializable(this.prisma, async (tx) => {
      const session = await this.findSessionOrFail(tx, id);
      validateParticipant(session, userId);
      validateState(session, 'PENDIENTE_CIERRE');
      if (
        absentId !== null &&
        absentId !== session.id_tutor &&
        absentId !== session.id_tutee
      ) {
        throw new BadRequestException(
          'El usuario inasistente debe participar en la sesión.',
        );
      }

      const inserted = await tx.declaracion_cierre.createMany({
        data: [
          {
            id_sesion: id,
            id_usuario: userId,
            resultado_declarado: dto.resultado_declarado,
            id_usuario_inasistente: absentId,
          },
        ],
        skipDuplicates: true,
      });
      if (inserted.count !== 1) {
        throw new ConflictException(
          'Ya registraste una declaración para esta sesión.',
        );
      }

      const declarations = await tx.declaracion_cierre.findMany({
        where: { id_sesion: id },
        orderBy: { fecha_declaracion: 'asc' },
      });
      const own = declarations.find(
        (declaration) => declaration.id_usuario === userId,
      )!;
      if (declarations.length === 1) return { session, declaration: own };

      const sameResult =
        declarations[0].resultado_declarado ===
          declarations[1].resultado_declarado &&
        declarations[0].id_usuario_inasistente ===
          declarations[1].id_usuario_inasistente;
      const next = sameResult ? dto.resultado_declarado : 'EN_CONFLICTO';
      const updated = await this.transitionSession(tx, session, next);
      return { session: updated, declaration: own };
    });

    return {
      sesion: toSessionResponse(result.session),
      declaracion: toDeclarationResponse(result.declaration),
    };
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
          ValidateTransition(session.estado_sesion, 'EXPIRADA');
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

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  async handleFinishedSessions(): Promise<void> {
    ValidateTransition('CONFIRMADA', 'PENDIENTE_CIERRE');
    await this.prisma.sesion.updateMany({
      where: {
        estado_sesion: 'CONFIRMADA',
        fin: { lte: new Date() },
      },
      data: { estado_sesion: 'PENDIENTE_CIERRE' },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  async resolverDeclaracionesVencidas(): Promise<void> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const pending = await this.prisma.sesion.findMany({
      where: {
        estado_sesion: 'PENDIENTE_CIERRE',
        declaraciones: { some: { fecha_declaracion: { lte: cutoff } } },
      },
      select: { id_sesion: true },
    });
    for (const candidate of pending) {
      try {
        await runSerializable(this.prisma, async (tx) => {
          const session = await tx.sesion.findUnique({
            where: { id_sesion: candidate.id_sesion },
            include: { declaraciones: true },
          });
          if (
            !session ||
            session.estado_sesion !== 'PENDIENTE_CIERRE' ||
            session.declaraciones.length !== 1 ||
            session.declaraciones[0].fecha_declaracion > cutoff
          )
            return;

          await this.transitionSession(
            tx,
            session,
            session.declaraciones[0].resultado_declarado,
            true,
          );
        });
      } catch {
        this.logger.error(
          `No se pudo resolver provisionalmente la sesión ${candidate.id_sesion}.`,
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

  private validateAbsence(dto: DeclararCierreDto): bigint | null {
    if (dto.resultado_declarado === 'INASISTENCIA') {
      if (
        dto.id_usuario_inasistente === undefined ||
        dto.id_usuario_inasistente === null
      ) {
        throw new BadRequestException(
          'Debes indicar qué participante no asistió.',
        );
      }
      return parseIdentifier(
        dto.id_usuario_inasistente,
        'id_usuario_inasistente',
      );
    }
    if (dto.id_usuario_inasistente !== undefined) {
      throw new BadRequestException(
        'Solo la inasistencia admite id_usuario_inasistente.',
      );
    }
    return null;
  }

  private async transitionSession(
    tx: Prisma.TransactionClient,
    session: sesion,
    next: sesion_estado_sesion_enum,
    provisional = false,
  ) {
    ValidateTransition(session.estado_sesion, next);
    const result = await tx.sesion.updateMany({
      where: {
        id_sesion: session.id_sesion,
        estado_sesion: session.estado_sesion,
      },
      data: { estado_sesion: next, resultado_provisional: provisional },
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
