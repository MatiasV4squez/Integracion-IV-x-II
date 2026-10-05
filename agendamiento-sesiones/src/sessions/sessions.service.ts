import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { runSerializable } from '../database/serializable-transaction';
import { type Prisma, type resultado_cierre_enum, type sesion, type sesion_estado_sesion_enum } from '../generated/prisma/client';
import { CreateSessionDto } from './dto/create-session.dto';
import { CalificarSesionDto } from './dto/calificar-sesion.dto';
import { DeclararCierreDto } from './dto/declarar-cierre.dto';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';
import { ReputacionIntegracionService } from './reputacion-integracion.service';
import { aRespuestaCalificacion, OCCUPYING_STATES, parseIdentifier, toDeclarationResponse, toSessionResponse, ValidateTransition, validateParticipant, validateState, validateTutor } from './session.rules';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reputacionIntegracion: ReputacionIntegracionService,
  ) {}

  createSession(dto: CreateSessionDto) {
    parseIdentifier(dto.id_tutor, 'id_tutor');
    parseIdentifier(dto.id_tutee, 'id_tutee');
    parseIdentifier(dto.id_materia, 'id_materia');
    parseIdentifier(dto.id_bloque, 'id_bloque');
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

  // 1. Obtener historial de sesiones por usuario
  async getHistorialSesiones(idUsuario: string) {
    const userId = parseIdentifier(idUsuario, 'id_usuario');

    const sesiones = await this.prisma.sesion.findMany({
      where: {
        OR: [
          { id_tutee: userId },
          { id_tutor: userId },
        ],
      },
      orderBy: {
        fecha_creacion: 'desc',
      },
      include: { calificaciones: true },
    });

    return sesiones.map((sesion) => ({
      ...toSessionResponse(sesion),
      calificaciones: sesion.calificaciones.map(aRespuestaCalificacion),
    }));
  }

  // 2. Resolución administrativa de conflictos
  async resolveConflict(
    idSesion: string,
    resolveConflictDto: ResolveConflictDto,
    idAdmin: string,
  ) {
    const id = parseIdentifier(idSesion, 'id_sesion');
    const adminId = parseIdentifier(idAdmin, 'id_admin');

    const updated = await runSerializable(this.prisma, async (tx) => {
      const session = await this.findSessionOrFail(tx, id);

      validateState(session, 'EN_CONFLICTO');
      const nextState = resolveConflictDto.nuevo_estado as sesion_estado_sesion_enum;
      const resolved = await this.transitionSession(tx, session, nextState);
      await tx.resolucion_conflicto_sesion.create({
        data: {
          id_sesion: id,
          id_administrador: adminId,
          estado_final: resolveConflictDto.nuevo_estado as resultado_cierre_enum,
          motivo_resolucion: resolveConflictDto.motivo_resolucion.trim(),
          observaciones: resolveConflictDto.observaciones ?? null,
        },
      });
      return resolved;
    });

    return toSessionResponse(updated);
  }

  async calificarSesion(
    idSesion: string,
    idUsuario: string,
    dto: CalificarSesionDto,
  ) {
    const idSesionNumerico = parseIdentifier(idSesion, 'id_sesion');
    const evaluador = parseIdentifier(idUsuario, 'id_usuario');
    const resultado = await runSerializable(this.prisma, async (transaccion) => {
      const sesion = await this.findSessionOrFail(
        transaccion,
        idSesionNumerico,
      );
      validateParticipant(sesion, evaluador);
      validateState(sesion, 'COMPLETADA');
      const evaluado =
        evaluador === sesion.id_tutor ? sesion.id_tutee : sesion.id_tutor;
      if (evaluador === evaluado) {
        throw new BadRequestException('No puedes calificarte a ti mismo.');
      }

      const insercion = await transaccion.calificacion.createMany({
        data: [{
          id_sesion: idSesionNumerico,
          id_evaluador: evaluador,
          id_evaluado: evaluado,
          puntuacion: dto.puntuacion,
        }],
        skipDuplicates: true,
      });
      if (insercion.count !== 1) {
        throw new ConflictException('Ya calificaste esta sesión.');
      }
      const calificacion = await transaccion.calificacion.findUniqueOrThrow({
        where: {
          id_sesion_id_evaluador: {
            id_sesion: idSesionNumerico,
            id_evaluador: evaluador,
          },
        },
      });
      const reputacionTutor = await this.calcularReputacionTutor(
        transaccion,
        sesion.id_tutor,
      );
      const debeSincronizar = evaluado === sesion.id_tutor;
      if (debeSincronizar) {
        await transaccion.entrega_reputacion_tutor.create({
          data: { id_calificacion: calificacion.id_calificacion },
        });
      }
      return { calificacion, reputacionTutor, debeSincronizar };
    });

    if (resultado.debeSincronizar) {
      try {
        await this.reputacionIntegracion.enviarCalificacion(
          resultado.calificacion.id_calificacion,
        );
      } catch {
        this.logger.error('No se pudo iniciar la sincronización de reputación.');
      }
    }
    return {
      calificacion: aRespuestaCalificacion(resultado.calificacion),
      reputacion_tutor: resultado.reputacionTutor,
    };
  }

  async obtenerReputacionTutor(idTutor: string) {
    const idTutorNumerico = parseIdentifier(idTutor, 'id_tutor');
    return this.calcularReputacionTutor(this.prisma, idTutorNumerico);
  }

  private async calcularReputacionTutor(
    cliente: Pick<Prisma.TransactionClient, 'calificacion'>,
    idTutor: bigint,
  ) {
    const resumen = await cliente.calificacion.aggregate({
      where: { id_evaluado: idTutor, sesion: { id_tutor: idTutor } },
      _avg: { puntuacion: true },
      _count: { _all: true },
    });
    const cantidad = resumen._count._all;
    const promedio = resumen._avg.puntuacion;
    return {
      id_tutor: idTutor.toString(),
      cantidad_calificaciones: cantidad,
      promedio,
      requiere_revision: cantidad >= 3 && promedio !== null && promedio < 2.5,
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
