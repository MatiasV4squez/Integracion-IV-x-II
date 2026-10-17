import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../auth/autenticacion-request';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { ErrorSesionFilter } from './error-sesion.filter';
import { GestionarDisponibilidadTutor } from '../../aplicacion/casos-de-uso/gestionar-disponibilidad-tutor';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';
import { EditarDisponibilidadDto } from './dto/editar-disponibilidad.dto';
import { ConsultarDisponibilidadDto } from './dto/consultar-disponibilidad.dto';
import { aRespuestaDisponibilidad } from './respuestas-disponibilidad';
import { interpretarIdentificador } from '../../dominio/reglas/reglas-sesion';

@ApiTags('Disponibilidad Tutor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(ErrorSesionFilter)
@Controller('tutores')
export class DisponibilidadTutorController {
  constructor(private readonly gestionar: GestionarDisponibilidadTutor) {}

  private exigirTutorPropietario(
    solicitud: AuthenticatedRequest,
    idTutor: string,
  ): bigint {
    const esTutor = solicitud.user.roles.some((rol) =>
      ['TUTOR', 'ADMINISTRADOR', 'ADMIN'].includes(rol.trim().toUpperCase()),
    );
    if (!esTutor) {
      throw new ForbiddenException(
        'Solo un tutor puede gestionar su propia disponibilidad.',
      );
    }
    const tutorId = interpretarIdentificador(idTutor, 'id_tutor');
    if (tutorId !== BigInt(solicitud.user.idUsuario)) {
      throw new ForbiddenException(
        'Solo puedes gestionar tu propia disponibilidad.',
      );
    }
    return tutorId;
  }

  @Get(':idTutor/disponibilidad')
  @ApiOperation({
    summary: 'Listar los bloques de disponibilidad de un tutor',
    description:
      'Devuelve los bloques horarios del tutor autenticado, opcionalmente filtrados por estado y día.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de bloques de disponibilidad del tutor.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT ausente o inválido.' })
  @ApiResponse({
    status: 403,
    description: 'Solo el tutor propietario puede consultar su disponibilidad.',
  })
  async listarDisponibilidad(
    @Param('idTutor') idTutor: string,
    @Query() filtros: ConsultarDisponibilidadDto,
    @Req() solicitud: AuthenticatedRequest,
  ) {
    this.exigirTutorPropietario(solicitud, idTutor);
    const bloques = await this.gestionar.listarDisponibilidad(idTutor, {
      estado: filtros.estado,
      dia: filtros.dia,
    });
    return bloques.map(aRespuestaDisponibilidad);
  }

  @Post(':idTutor/disponibilidad')
  @ApiOperation({
    summary: 'Crear un bloque de disponibilidad del tutor',
    description:
      'Crea un bloque horario disponible para el tutor autenticado (formulario de alta).',
  })
  @ApiResponse({
    status: 201,
    description: 'Bloque de disponibilidad creado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Entrada inválida o horario que se solapa con otro bloque.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT ausente o inválido.' })
  @ApiResponse({
    status: 403,
    description: 'Solo el tutor propietario puede crear su disponibilidad.',
  })
  async crearDisponibilidad(
    @Param('idTutor') idTutor: string,
    @Body() entrada: CrearDisponibilidadDto,
    @Req() solicitud: AuthenticatedRequest,
  ) {
    this.exigirTutorPropietario(solicitud, idTutor);
    const creada = await this.gestionar.crearDisponibilidad(idTutor, entrada);
    return aRespuestaDisponibilidad(creada);
  }

  @Patch(':idTutor/disponibilidad/:idDisponibilidad')
  @ApiOperation({
    summary: 'Editar un bloque de disponibilidad del tutor',
    description:
      'Edita el horario y/o el estado de un bloque de disponibilidad (formulario de edición).',
  })
  @ApiResponse({
    status: 200,
    description: 'Bloque de disponibilidad editado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Entrada inválida, bloque no encontrado o solapamiento.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT ausente o inválido.' })
  @ApiResponse({
    status: 403,
    description: 'Solo el tutor propietario puede editar el bloque.',
  })
  async editarDisponibilidad(
    @Param('idTutor') idTutor: string,
    @Param('idDisponibilidad') idDisponibilidad: string,
    @Body() entrada: EditarDisponibilidadDto,
    @Req() solicitud: AuthenticatedRequest,
  ) {
    this.exigirTutorPropietario(solicitud, idTutor);
    const editada = await this.gestionar.editarDisponibilidad(
      idTutor,
      idDisponibilidad,
      entrada,
    );
    return aRespuestaDisponibilidad(editada);
  }

  @Delete(':idTutor/disponibilidad/:idDisponibilidad')
  @ApiOperation({
    summary: 'Eliminar un bloque de disponibilidad del tutor',
    description: 'Elimina un bloque de disponibilidad del tutor autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bloque de disponibilidad eliminado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bloque no encontrado, ya reservado o ya eliminado.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT ausente o inválido.' })
  @ApiResponse({
    status: 403,
    description: 'Solo el tutor propietario puede eliminar el bloque.',
  })
  async eliminarDisponibilidad(
    @Param('idTutor') idTutor: string,
    @Param('idDisponibilidad') idDisponibilidad: string,
    @Req() solicitud: AuthenticatedRequest,
  ) {
    this.exigirTutorPropietario(solicitud, idTutor);
    await this.gestionar.eliminarDisponibilidad(idTutor, idDisponibilidad);
    const id = interpretarIdentificador(idDisponibilidad, 'id_disponibilidad');
    return { id_disponibilidad: id.toString(), eliminado: true };
  }
}
