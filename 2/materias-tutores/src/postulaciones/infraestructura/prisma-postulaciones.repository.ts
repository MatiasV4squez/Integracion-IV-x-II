import { Injectable } from '@nestjs/common';
import { Prisma, type PostulacionTutor } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { NuevaPostulacion, PostulacionesRepository } from '../aplicacion/puertos/postulaciones.repository.js';
import { PostulacionesError, type Postulacion } from '../dominio/postulacion.js';

function convertir(postulacion: PostulacionTutor): Postulacion {
  return { ...postulacion, notaAcreditada: postulacion.notaAcreditada?.toNumber() ?? null };
}

@Injectable()
export class PrismaPostulacionesRepository implements PostulacionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existeMateria(idMateria: bigint): Promise<boolean> {
    return await this.prisma.materia.findUnique({ where: { idMateria } }) !== null;
  }

  async existeActiva(idUsuario: bigint, idMateria: bigint): Promise<boolean> {
    return await this.prisma.postulacionTutor.findFirst({
      where: { idUsuario, idMateria, estado: { in: ['PENDIENTE', 'PENDIENTE_ROL', 'APROBADA'] } },
    }) !== null;
  }

  async crear(datos: NuevaPostulacion): Promise<Postulacion> {
    try {
      return convertir(await this.prisma.postulacionTutor.create({ data: datos }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new PostulacionesError('CONFLICTO', 'Ya existe una postulación activa para esta materia');
      }
      throw error;
    }
  }

  async listarPendientes(): Promise<Postulacion[]> {
    const registros = await this.prisma.postulacionTutor.findMany({
      where: { estado: { in: ['PENDIENTE', 'PENDIENTE_ROL'] } },
      orderBy: [{ fechaPostulacion: 'asc' }, { idPostulacion: 'asc' }],
    });
    return registros.map(convertir);
  }

  async consultarPropias(idUsuario: bigint): Promise<Postulacion[]> {
    return (await this.prisma.postulacionTutor.findMany({ where: { idUsuario }, orderBy: { fechaPostulacion: 'desc' } })).map(convertir);
  }

  async obtener(idPostulacion: bigint): Promise<Postulacion | null> {
    const registro = await this.prisma.postulacionTutor.findUnique({ where: { idPostulacion } });
    return registro ? convertir(registro) : null;
  }

  prepararAprobacion(idPostulacion: bigint, idAdministrador: bigint, nota: number, fecha: Date): Promise<Postulacion | null> {
    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.postulacionTutor.updateMany({
        where: { idPostulacion, estado: 'PENDIENTE' },
        data: { estado: 'PENDIENTE_ROL', idAdministradorRevision: idAdministrador, notaAcreditada: nota, fechaRevision: fecha },
      });
      if (actualizada.count !== 1) return null;
      const registro = await tx.postulacionTutor.findUniqueOrThrow({ where: { idPostulacion } });
      await tx.tutorMateria.upsert({
        where: { idUsuario_idMateria: { idUsuario: registro.idUsuario, idMateria: registro.idMateria } },
        create: { idUsuario: registro.idUsuario, idMateria: registro.idMateria, vigente: false },
        update: { vigente: false },
      });
      return convertir(registro);
    });
  }

  async rechazarPendiente(idPostulacion: bigint, idAdministrador: bigint, motivo: string, fecha: Date): Promise<Postulacion | null> {
    const resultado = await this.prisma.postulacionTutor.updateMany({
      where: { idPostulacion, estado: 'PENDIENTE' },
      data: { estado: 'RECHAZADA', idAdministradorRevision: idAdministrador, fechaRevision: fecha, motivoRechazo: motivo },
    });
    if (resultado.count !== 1) return null;
    return convertir(await this.prisma.postulacionTutor.findUniqueOrThrow({ where: { idPostulacion } }));
  }

  habilitar(postulacion: Postulacion): Promise<Postulacion> {
    return this.prisma.$transaction(async (tx) => {
      await tx.tutorMateria.update({
        where: { idUsuario_idMateria: { idUsuario: postulacion.idUsuario, idMateria: postulacion.idMateria } },
        data: { vigente: true, fechaHabilitacion: new Date() },
      });
      await tx.postulacionTutor.update({ where: { idPostulacion: postulacion.idPostulacion }, data: { estado: 'APROBADA' } });
      await tx.perfilTutor.upsert({ where: { idUsuario: postulacion.idUsuario }, create: { idUsuario: postulacion.idUsuario }, update: {} });
      return convertir(await tx.postulacionTutor.findUniqueOrThrow({ where: { idPostulacion: postulacion.idPostulacion } }));
    });
  }
}
