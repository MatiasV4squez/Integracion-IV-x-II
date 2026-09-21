import { Controller, Get } from '@nestjs/common';
import { MateriasService } from './materias.service.js';
import type { MateriaListItemResponseDto } from './dto/materia-list-item.response.dto.js';

@Controller('materias')
export class MateriasController {
  constructor(private readonly materiasService: MateriasService) {}

  @Get()
  listarMaterias(): Promise<MateriaListItemResponseDto[]> {
    return this.materiasService.listarMaterias();
  }
}
