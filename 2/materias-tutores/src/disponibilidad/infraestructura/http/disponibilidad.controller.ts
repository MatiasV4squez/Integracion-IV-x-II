import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { parsePositiveId } from '../../../auth/parse-positive-id.js';
import { TutorJwtGuard, type TutorRequest } from '../../../auth/tutor-jwt.guard.js';
import { CrearBloqueUseCase } from '../../aplicacion/crear-bloque.use-case.js';
import { ListarBloquesUseCase } from '../../aplicacion/listar-bloques.use-case.js';
import { ActualizarBloqueUseCase } from '../../aplicacion/actualizar-bloque.use-case.js';
import { DesactivarBloqueUseCase } from '../../aplicacion/desactivar-bloque.use-case.js';
import { validarActualizarBloque, validarCrearBloque } from './dto/validate-bloque-body.js';
import { DisponibilidadErrorFilter } from './disponibilidad-error.filter.js';
import { presentarBloque } from './presentar-bloque.js';

@UseFilters(DisponibilidadErrorFilter)
@UseGuards(TutorJwtGuard)
@Controller('disponibilidad/bloques')
export class DisponibilidadController {
  constructor(
    private readonly crear: CrearBloqueUseCase,
    private readonly listar: ListarBloquesUseCase,
    private readonly actualizar: ActualizarBloqueUseCase,
    private readonly desactivar: DesactivarBloqueUseCase,
  ) {}

  @Post()
  async crearBloque(@Req() peticion: TutorRequest, @Body() cuerpo: unknown) {
    return presentarBloque(await this.crear.ejecutar(peticion.idTutor, validarCrearBloque(cuerpo)));
  }

  @Get()
  async listarBloques(@Req() peticion: TutorRequest) {
    return (await this.listar.ejecutar(peticion.idTutor)).map(presentarBloque);
  }

  @Patch(':idBloque')
  async actualizarBloque(@Req() peticion: TutorRequest, @Param('idBloque') idBloque: string, @Body() cuerpo: unknown) {
    return presentarBloque(await this.actualizar.ejecutar(peticion.idTutor, this.leerIdBloque(idBloque), validarActualizarBloque(cuerpo)));
  }

  @Delete(':idBloque')
  async desactivarBloque(@Req() peticion: TutorRequest, @Param('idBloque') idBloque: string) {
    return presentarBloque(await this.desactivar.ejecutar(peticion.idTutor, this.leerIdBloque(idBloque)));
  }

  private leerIdBloque(texto: string): bigint {
    const id = parsePositiveId(texto);
    if (id === null) throw new BadRequestException('idBloque debe ser un entero positivo');
    return id;
  }
}
