import {
  BadRequestException,
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedJwtGuard } from '../auth/authenticated-jwt.guard.js';
import { parsePositiveId } from '../auth/parse-positive-id.js';
import type { BloqueDisponibilidadResponseDto } from './dto/bloque-disponibilidad.response.dto.js';
import { DisponibilidadService } from './disponibilidad.service.js';

@UseGuards(AuthenticatedJwtGuard)
@Controller('disponibilidad/tutores')
export class ConsultaDisponibilidadController {
  constructor(private readonly disponibilidadService: DisponibilidadService) {}

  @Get(':idTutor')
  consultarDisponibilidad(
    @Param('idTutor') idTutorTexto: string,
  ): Promise<BloqueDisponibilidadResponseDto[]> {
    const idTutor = parsePositiveId(idTutorTexto);
    if (idTutor === null) {
      throw new BadRequestException('idTutor debe ser un entero positivo');
    }

    return this.disponibilidadService.consultarDisponibilidadTutor(idTutor);
  }
}
