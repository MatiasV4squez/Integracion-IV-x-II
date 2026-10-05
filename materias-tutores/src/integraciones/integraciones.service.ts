import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class IntegracionesService {
  constructor(private readonly prisma: PrismaService) {}

  async cambiarEstadoBloque(
    idBloque: bigint,
    estado: 'DISPONIBLE' | 'RESERVADO',
  ) {
    const bloque = await this.prisma.bloqueHorario.findUnique({
      where: { idBloque },
    });
    if (!bloque) throw new NotFoundException('Bloque no encontrado');
    if (bloque.estadoBloque === estado)
      return { idBloque: idBloque.toString(), estadoBloque: estado };
    const anterior = estado === 'RESERVADO' ? 'DISPONIBLE' : 'RESERVADO';
    const resultado = await this.prisma.bloqueHorario.updateMany({
      where: { idBloque, estadoBloque: anterior },
      data: { estadoBloque: estado },
    });
    if (resultado.count !== 1)
      throw new ConflictException(
        'El bloque cambió o no permite esta transición',
      );
    return { idBloque: idBloque.toString(), estadoBloque: estado };
  }

  async registrarCalificacion(
    idTutor: bigint,
    idCalificacion: bigint,
    puntuacion: number,
  ) {
    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
      throw new ConflictException('La puntuación debe estar entre 1 y 5');
    }
    for (let intento = 0; intento < 3; intento++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const habilitado = await tx.tutorMateria.findFirst({
              where: { idUsuario: idTutor, vigente: true },
            });
            if (!habilitado)
              throw new ConflictException(
                'El usuario no está habilitado como tutor',
              );
            const procesada = await tx.calificacionTutorProcesada.findUnique({
              where: { idCalificacion },
            });
            if (procesada) {
              if (
                procesada.idTutor !== idTutor ||
                procesada.puntuacion !== puntuacion
              )
                throw new ConflictException(
                  'La calificación ya pertenece a otro evento',
                );
              const perfil = await tx.perfilTutor.findUniqueOrThrow({
                where: { idUsuario: idTutor },
              });
              return this.mapearReputacion(perfil);
            }
            await tx.calificacionTutorProcesada.create({
              data: { idCalificacion, idTutor, puntuacion },
            });
            const perfil = await tx.perfilTutor.upsert({
              where: { idUsuario: idTutor },
              create: {
                idUsuario: idTutor,
                cantidadCalificaciones: 1,
                sumaCalificaciones: puntuacion,
              },
              update: {
                cantidadCalificaciones: { increment: 1 },
                sumaCalificaciones: { increment: puntuacion },
              },
            });
            const estado =
              perfil.estado === 'EN_REVISION' ||
              (perfil.cantidadCalificaciones >= 3 &&
                perfil.sumaCalificaciones / perfil.cantidadCalificaciones < 2.5)
                ? 'EN_REVISION'
                : 'ACTIVO';
            const actualizado = await tx.perfilTutor.update({
              where: { idUsuario: idTutor },
              data: { estado },
            });
            return this.mapearReputacion(actualizado);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2034', 'P2002'].includes(error.code) &&
          intento < 2
        )
          continue;
        throw error;
      }
    }
    throw new ConflictException('No se pudo registrar la calificación');
  }

  async consultarReputacion(idTutor: bigint) {
    const perfil = await this.prisma.perfilTutor.findUnique({
      where: { idUsuario: idTutor },
    });
    if (!perfil) throw new NotFoundException('Tutor no encontrado');
    return this.mapearReputacion(perfil);
  }

  private mapearReputacion(perfil: {
    idUsuario: bigint;
    cantidadCalificaciones: number;
    sumaCalificaciones: number;
    estado: string;
  }) {
    return {
      idTutor: perfil.idUsuario.toString(),
      cantidadCalificaciones: perfil.cantidadCalificaciones,
      promedio: perfil.cantidadCalificaciones
        ? perfil.sumaCalificaciones / perfil.cantidadCalificaciones
        : null,
      estado: perfil.estado,
    };
  }
}
