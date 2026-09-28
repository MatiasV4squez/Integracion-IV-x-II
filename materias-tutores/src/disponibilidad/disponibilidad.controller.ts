import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { parsePositiveId } from '../auth/parse-positive-id.js';
import { TutorJwtGuard, type TutorRequest } from '../auth/tutor-jwt.guard.js';
import type { BloqueDisponibilidadResponseDto } from './dto/bloque-disponibilidad.response.dto.js';
import {
  validarActualizarBloque,
  validarCrearBloque,
} from './dto/validate-bloque-body.js';
import { DisponibilidadService } from './disponibilidad.service.js';

@UseGuards(TutorJwtGuard)
@Controller('disponibilidad/bloques')
export class DisponibilidadController {
  constructor(private readonly disponibilidadService: DisponibilidadService) {}

  @Post()
  crearBloque(
    @Req() request: TutorRequest,
    @Body() body: unknown,
  ): Promise<BloqueDisponibilidadResponseDto> {
    return this.disponibilidadService.crearBloque(
      request.idTutor,
      validarCrearBloque(body),
    );
  }

  @Get()
  listarBloques(
    @Req() request: TutorRequest,
  ): Promise<BloqueDisponibilidadResponseDto[]> {
    return this.disponibilidadService.listarBloques(request.idTutor);
  }

  @Patch(':idBloque')
  actualizarBloque(
    @Req() request: TutorRequest,
    @Param('idBloque') idBloque: string,
    @Body() body: unknown,
  ): Promise<BloqueDisponibilidadResponseDto> {
    return this.disponibilidadService.actualizarBloque(
      request.idTutor,
      this.leerIdBloque(idBloque),
      validarActualizarBloque(body),
    );
  }

  @Delete(':idBloque')
  desactivarBloque(
    @Req() request: TutorRequest,
    @Param('idBloque') idBloque: string,
  ): Promise<BloqueDisponibilidadResponseDto> {
    return this.disponibilidadService.desactivarBloque(
      request.idTutor,
      this.leerIdBloque(idBloque),
    );
  }

  private leerIdBloque(value: string): bigint {
    const idBloque = parsePositiveId(value);
    if (idBloque === null) {
      throw new BadRequestException('idBloque debe ser un entero positivo');
    }
    return idBloque;
  }
}
