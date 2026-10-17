import type { Prisma } from '../../../generated/prisma/client';
import type { RepositorioDisponibilidadTutor } from '../../aplicacion/puertos/repositorio-disponibilidad-tutor.puerto';
import type { DisponibilidadTutor } from '../../dominio/entidades/disponibilidad-tutor';
import type { EstadoDisponibilidad } from '../../dominio/tipos/estado-disponibilidad';
import {
  finDelDia,
  inicioDelDia,
} from '../../dominio/reglas/reglas-disponibilidad';

export class RepositorioDisponibilidadTutorPrisma implements RepositorioDisponibilidadTutor {
  constructor(private readonly cliente: Prisma.TransactionClient) {}

  async listarPorTutor(
    idTutor: bigint,
    filtros?: { estado?: EstadoDisponibilidad; dia?: string },
  ): Promise<DisponibilidadTutor[]> {
    const where: Prisma.disponibilidad_tutorWhereInput = {
      id_tutor: idTutor,
    };
    if (filtros?.estado) {
      where.estado = filtros.estado;
    }
    if (filtros?.dia) {
      where.inicio = {
        gte: inicioDelDia(filtros.dia),
        lt: finDelDia(filtros.dia),
      };
    }
    return this.cliente.disponibilidad_tutor.findMany({
      where,
      orderBy: { inicio: 'asc' },
    });
  }

  async buscarPorId(id: bigint): Promise<DisponibilidadTutor | null> {
    return this.cliente.disponibilidad_tutor.findUnique({
      where: { id_disponibilidad: id },
    });
  }

  async crear(datos: {
    id_tutor: bigint;
    inicio: Date;
    fin: Date;
    estado?: EstadoDisponibilidad;
  }): Promise<DisponibilidadTutor> {
    return this.cliente.disponibilidad_tutor.create({
      data: {
        id_tutor: datos.id_tutor,
        inicio: datos.inicio,
        fin: datos.fin,
        estado: datos.estado ?? 'DISPONIBLE',
      },
    });
  }

  async actualizar(
    id: bigint,
    cambios: Partial<{
      inicio: Date;
      fin: Date;
      estado: EstadoDisponibilidad;
    }>,
  ): Promise<DisponibilidadTutor | null> {
    const resultado = await this.cliente.disponibilidad_tutor.updateMany({
      where: { id_disponibilidad: id },
      data: cambios,
    });
    if (resultado.count !== 1) return null;
    return this.cliente.disponibilidad_tutor.findUniqueOrThrow({
      where: { id_disponibilidad: id },
    });
  }

  async eliminar(id: bigint): Promise<boolean> {
    const resultado = await this.cliente.disponibilidad_tutor.delete({
      where: { id_disponibilidad: id },
      select: { id_disponibilidad: true },
    });
    return resultado !== null;
  }

  async existeSolapamiento(
    idTutor: bigint,
    inicio: Date,
    fin: Date,
    excluirId?: bigint,
  ): Promise<boolean> {
    const encontrada = await this.cliente.disponibilidad_tutor.findFirst({
      where: {
        id_tutor: idTutor,
        id_disponibilidad: excluirId ? { not: excluirId } : undefined,
        inicio: { lt: fin },
        fin: { gt: inicio },
      },
      select: { id_disponibilidad: true },
    });
    return encontrada !== null;
  }
}
