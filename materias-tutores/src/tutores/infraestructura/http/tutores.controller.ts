import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ConsultaTutoresGuard } from '../../../auth/consulta-tutores.guard.js';
import { parsePositiveId } from '../../../auth/parse-positive-id.js';
import { BuscarTutoresPorMateriaUseCase } from '../../aplicacion/buscar-tutores-por-materia.use-case.js';
import { validarPaginacion } from './dto/validar-paginacion.js';

@Controller('tutores')
@UseGuards(ConsultaTutoresGuard)
@ApiBearerAuth()
@ApiSecurity('integracion')
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
