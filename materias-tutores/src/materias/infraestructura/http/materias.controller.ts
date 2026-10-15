import { Controller, Get } from '@nestjs/common';
import { ListarMateriasUseCase } from '../../aplicacion/listar-materias.use-case.js';
import type { MateriaListItemResponseDto } from './dto/materia-list-item.response.dto.js';

@Controller('materias')
export class MateriasController {
  constructor(private readonly listarMaterias: ListarMateriasUseCase) {}

  @Get()
  async listar(): Promise<MateriaListItemResponseDto[]> {
    const materias = await this.listarMaterias.ejecutar();
    return materias.map(({ codigo, nombre }) => ({ codigo, nombre }));
  }
}
