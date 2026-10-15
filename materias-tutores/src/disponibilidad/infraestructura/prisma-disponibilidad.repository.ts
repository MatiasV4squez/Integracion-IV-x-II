import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma, type BloqueHorario as BloquePrisma } from '../../generated/prisma/client.js';
import type { DisponibilidadRepository } from '../aplicacion/puertos/disponibilidad.repository.js';
import { DisponibilidadError, type BloqueHorario, type HorarioBloque } from '../dominio/bloque-horario.js';
import type { ReferenciaHorario } from '../dominio/horario-santiago.js';

function fechaSql(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

function horaSql(hora: string): Date {
  return new Date(`1970-01-01T${hora}:00.000Z`);
}

function datosSql(horario: HorarioBloque) {
  return { dia: fechaSql(horario.dia), horaInicio: horaSql(horario.horaInicio), horaFin: horaSql(horario.horaFin) };
}

function mapear(bloque: BloquePrisma): BloqueHorario {
  return {
    idBloque: bloque.idBloque,
    idTutor: bloque.idTutor,
    dia: bloque.dia.toISOString().slice(0, 10),
    horaInicio: bloque.horaInicio.toISOString().slice(11, 16),
    horaFin: bloque.horaFin.toISOString().slice(11, 16),
    estadoBloque: bloque.estadoBloque,
  };
}

@Injectable()
export class PrismaDisponibilidadRepository implements DisponibilidadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarActivosDelDia(idTutor: bigint, dia: string): Promise<BloqueHorario[]> {
    const bloques = await this.prisma.bloqueHorario.findMany({ where: { idTutor, dia: fechaSql(dia), estadoBloque: { not: 'INACTIVO' } } });
    return bloques.map(mapear);
  }

  async crear(idTutor: bigint, horario: HorarioBloque): Promise<BloqueHorario> {
    return mapear(await this.prisma.bloqueHorario.create({ data: { idTutor, ...datosSql(horario) } }));
  }

  async listarPropios(idTutor: bigint): Promise<BloqueHorario[]> {
    const bloques = await this.prisma.bloqueHorario.findMany({ where: { idTutor }, orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }] });
    return bloques.map(mapear);
  }

  async consultarDisponibles(idTutor: bigint, desde: ReferenciaHorario): Promise<BloqueHorario[]> {
    const bloques = await this.prisma.bloqueHorario.findMany({
      where: { idTutor, estadoBloque: 'DISPONIBLE', OR: [{ dia: { gt: fechaSql(desde.dia) } }, { dia: fechaSql(desde.dia), horaInicio: { gt: horaSql(desde.hora) } }] },
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }, { idBloque: 'asc' }],
    });
    return bloques.map(mapear);
  }

  async buscarPropio(idTutor: bigint, idBloque: bigint): Promise<BloqueHorario | null> {
    const bloque = await this.prisma.bloqueHorario.findUnique({ where: { idTutor, idBloque } });
    return bloque ? mapear(bloque) : null;
  }

  async actualizarDisponible(idTutor: bigint, idBloque: bigint, horario: HorarioBloque): Promise<BloqueHorario> {
    return this.escribirDisponible(idTutor, idBloque, datosSql(horario), 'actualizar');
  }

  async desactivarDisponible(idTutor: bigint, idBloque: bigint): Promise<BloqueHorario> {
    return this.escribirDisponible(idTutor, idBloque, { estadoBloque: 'INACTIVO' }, 'desactivar');
  }

  private async escribirDisponible(idTutor: bigint, idBloque: bigint, data: Prisma.BloqueHorarioUpdateInput, operacion: 'actualizar' | 'desactivar'): Promise<BloqueHorario> {
    try {
      return mapear(await this.prisma.bloqueHorario.update({ where: { idBloque, idTutor, estadoBloque: 'DISPONIBLE' }, data }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new DisponibilidadError('CONFLICTO', `El bloque cambió y ya no se puede ${operacion}`);
      throw error;
    }
  }
}
