import { BadRequestException, Controller, Get, Param, UseFilters, UseGuards } from '@nestjs/common';
import { AuthenticatedJwtGuard } from '../../../auth/authenticated-jwt.guard.js';
import { parsePositiveId } from '../../../auth/parse-positive-id.js';
import { ConsultarDisponibilidadTutorUseCase } from '../../aplicacion/consultar-disponibilidad-tutor.use-case.js';
import { DisponibilidadErrorFilter } from './disponibilidad-error.filter.js';
import { presentarBloque } from './presentar-bloque.js';

@UseFilters(DisponibilidadErrorFilter)
@UseGuards(AuthenticatedJwtGuard)
@Controller('disponibilidad/tutores')
export class ConsultaDisponibilidadController {
  constructor(private readonly consultar: ConsultarDisponibilidadTutorUseCase) {}

  @Get(':idTutor')
  async consultarDisponibilidad(@Param('idTutor') idTutorTexto: string) {
    const idTutor = parsePositiveId(idTutorTexto);
    if (idTutor === null) throw new BadRequestException('idTutor debe ser un entero positivo');
    return (await this.consultar.ejecutar(idTutor)).map(presentarBloque);
  }
}
