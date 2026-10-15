import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { MateriasRepository } from '../aplicacion/puertos/materias.repository.js';
import type { Materia } from '../dominio/materia.js';

@Injectable()
export class PrismaMateriasRepository implements MateriasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarCatalogo(): Promise<Materia[]> {
    const materias = await this.prisma.materia.findMany({
      select: { codigo: true, nombre: true },
      orderBy: { codigo: 'asc' },
    });
    return materias.map(({ codigo, nombre }) => ({ codigo, nombre }));
  }
}
