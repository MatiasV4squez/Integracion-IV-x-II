import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { parsePositiveId } from '../../../auth/parse-positive-id.js';
import { BuscarTutoresPorMateriaUseCase } from '../../application/buscar-tutores-por-materia.use-case.js';
import { validarPaginacion } from './dto/validar-paginacion.js';

@Controller('tutores')
export class TutoresController {
  constructor(private readonly buscarTutores: BuscarTutoresPorMateriaUseCase) {}

  @Get()
  buscarPorMateria(@Query('materiaId') materiaId: string, @Query('page') page: unknown, @Query('limit') limit: unknown) {
    const idMateria = parsePositiveId(materiaId);
    if (idMateria === null) {
      throw new BadRequestException('El parámetro materiaId debe ser un número entero positivo.');
    }

    const paginacion = validarPaginacion(page, limit);

    return this.buscarTutores.ejecutar(idMateria, paginacion);
  }
}
