import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ReputacionError, type EstadoReputacion, type PerfilReputacion } from '../domain/reputacion.js';
import type { EventoCalificacion, ReputacionRepository, ReputacionTransaccion } from '../application/ports/reputacion.repository.js';

type PerfilPersistido = {
  idUsuario: bigint;
  sumaCalificaciones: number;
  cantidadCalificaciones: number;
  estado: string;
};

function mapearPerfil(perfil: PerfilPersistido | null): PerfilReputacion | null {
  if (!perfil) return null;
  if (perfil.estado !== 'ACTIVO' && perfil.estado !== 'EN_REVISION') {
    throw new Error('Estado de reputación almacenado inválido.');
  }
  return { idTutor: perfil.idUsuario, sumaCalificaciones: perfil.sumaCalificaciones, cantidadCalificaciones: perfil.cantidadCalificaciones, estado: perfil.estado };
}

function esConflictoReintentable(error: unknown, profundidad = 0): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) return true;
  if (!error || typeof error !== 'object' || profundidad > 5) return false;
  const datos = error as Record<string, unknown>;
  if (['40001', '40P01'].includes(String(datos.originalCode ?? datos.code))) return true;
  return ['cause', 'meta', 'driverAdapterError'].some((campo) => esConflictoReintentable(datos[campo], profundidad + 1));
}

class PrismaReputacionTransaccion implements ReputacionTransaccion {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  buscarEvento(idCalificacion: bigint): Promise<EventoCalificacion | null> {
    return this.tx.calificacionTutorProcesada.findUnique({ where: { idCalificacion } });
  }

  async buscarPerfil(idTutor: bigint): Promise<PerfilReputacion | null> {
    return mapearPerfil(await this.tx.perfilTutor.findUnique({ where: { idUsuario: idTutor } }));
  }

  async tutorHabilitado(idTutor: bigint): Promise<boolean> {
    return (await this.tx.tutorMateria.findFirst({ where: { idUsuario: idTutor, vigente: true }, select: { idTutorMateria: true } })) !== null;
  }

  async registrarEvento(evento: EventoCalificacion): Promise<void> {
    await this.tx.calificacionTutorProcesada.create({ data: evento });
  }

  async acumularCalificacion(idTutor: bigint, puntuacion: number): Promise<PerfilReputacion> {
    const perfil = await this.tx.perfilTutor.upsert({
      where: { idUsuario: idTutor },
      create: { idUsuario: idTutor, cantidadCalificaciones: 1, sumaCalificaciones: puntuacion },
      update: { cantidadCalificaciones: { increment: 1 }, sumaCalificaciones: { increment: puntuacion } },
    });
    return mapearPerfil(perfil)!;
  }

  async guardarEstado(idTutor: bigint, estado: EstadoReputacion): Promise<void> {
    await this.tx.perfilTutor.update({ where: { idUsuario: idTutor }, data: { estado } });
  }
}

@Injectable()
export class PrismaReputacionRepository implements ReputacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async consultarPerfil(idTutor: bigint): Promise<PerfilReputacion | null> {
    return mapearPerfil(await this.prisma.perfilTutor.findUnique({ where: { idUsuario: idTutor } }));
  }

  async tutorHabilitado(idTutor: bigint): Promise<boolean> {
    return (await this.prisma.tutorMateria.findFirst({ where: { idUsuario: idTutor, vigente: true }, select: { idTutorMateria: true } })) !== null;
  }

  async ejecutarTransaccion<T>(operacion: (tx: ReputacionTransaccion) => Promise<T>): Promise<T> {
    for (let intento = 0; intento < 3; intento++) {
      try {
        return await this.prisma.$transaction((tx) => operacion(new PrismaReputacionTransaccion(tx)), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (!esConflictoReintentable(error)) throw error;
        if (intento === 2) {
          throw new ReputacionError('CONFLICTO', 'Conflicto de concurrencia; reintenta el mismo evento.');
        }
      }
    }
    throw new ReputacionError('CONFLICTO', 'No se pudo registrar la calificación.');
  }
}
