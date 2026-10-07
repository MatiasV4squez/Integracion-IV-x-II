import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { parsePositiveId } from '../auth/parse-positive-id.js';
import { BuscarTutoresPorMateriaUseCase } from './application/buscar-tutores-por-materia.use-case.js';

@Controller('tutores')
export class TutoresController {
  constructor(private readonly buscarTutores: BuscarTutoresPorMateriaUseCase) {}

  @Get()
  buscarPorMateria(@Query('materiaId') materiaId: string) {
    const idMateria = parsePositiveId(materiaId);
    if (idMateria === null) {
      throw new BadRequestException('El parámetro materiaId debe ser un número entero positivo.');
    }
    return this.buscarTutores.ejecutar(idMateria);
  }
}
