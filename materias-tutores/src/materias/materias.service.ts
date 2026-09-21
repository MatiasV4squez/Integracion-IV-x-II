import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { MateriaListItemResponseDto } from './dto/materia-list-item.response.dto.js';

@Injectable()
export class MateriasService {
  constructor(private readonly prisma: PrismaService) {}

  async listarMaterias(): Promise<MateriaListItemResponseDto[]> {
    const materias = await this.prisma.materia.findMany({
      select: {
        codigo: true,
        nombre: true,
      },
      orderBy: {
        codigo: 'asc',
      },
    });

    return materias;
  }
}
