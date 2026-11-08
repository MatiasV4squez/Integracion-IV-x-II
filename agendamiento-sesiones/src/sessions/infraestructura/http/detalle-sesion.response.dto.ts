import { ApiProperty, OmitType } from '@nestjs/swagger';
import type { EstadoSesion, ResultadoCierre } from '../../dominio/tipos/estado-sesion';
import { SesionCreadaResponseDto } from './sesion-creada.response.dto';

class DatosEncuentroResponseDto {
  @ApiProperty({ type: String, enum: ['PRESENCIAL', 'EN_LINEA'], nullable: true })
  modalidad: 'PRESENCIAL' | 'EN_LINEA' | null;

  @ApiProperty({ type: String, nullable: true, maxLength: 255 })
  lugar: string | null;

  @ApiProperty({ type: String, nullable: true, maxLength: 2048 })
  enlace: string | null;
}

class DeclaracionCierreResponseDto {
  @ApiProperty({ type: String })
  id_declaracion: string;

  @ApiProperty({ type: String })
  id_sesion: string;

  @ApiProperty({ type: String })
  id_usuario: string;

  @ApiProperty({ enum: ['COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA'] })
  resultado_declarado: ResultadoCierre;

  @ApiProperty({ type: String, nullable: true })
  id_usuario_inasistente: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  fecha_declaracion: string;
}

class CalificacionResponseDto {
  @ApiProperty({ type: String })
  id_calificacion: string;

  @ApiProperty({ type: String })
  id_sesion: string;

  @ApiProperty({ type: String })
  id_evaluador: string;

  @ApiProperty({ type: String })
  id_evaluado: string;

  @ApiProperty({ type: Number, minimum: 1, maximum: 5 })
  puntuacion: number;

  @ApiProperty({ type: String, format: 'date-time' })
  fecha_calificacion: string;
}

class AccionesSesionResponseDto {
  @ApiProperty({ type: Boolean })
  aceptar: boolean;

  @ApiProperty({ type: Boolean })
  rechazar: boolean;

  @ApiProperty({ type: Boolean })
  cancelar: boolean;

  @ApiProperty({ type: Boolean })
  declarar_cierre: boolean;

  @ApiProperty({ type: Boolean })
  calificar: boolean;

  @ApiProperty({ type: Boolean })
  resolver_conflicto: boolean;
}

export class DetalleSesionResponseDto extends OmitType(SesionCreadaResponseDto, ['estado_sesion'] as const) {
  @ApiProperty({ enum: [
    'PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'EXPIRADA', 'CANCELADA',
    'PENDIENTE_CIERRE', 'COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA', 'EN_CONFLICTO',
  ] })
  estado_sesion: EstadoSesion;

  @ApiProperty({ type: DatosEncuentroResponseDto })
  datos_encuentro: DatosEncuentroResponseDto;

  @ApiProperty({ type: [DeclaracionCierreResponseDto] })
  declaraciones: DeclaracionCierreResponseDto[];

  @ApiProperty({ type: [CalificacionResponseDto] })
  calificaciones: CalificacionResponseDto[];

  @ApiProperty({
    type: AccionesSesionResponseDto,
    description: 'Acciones según participante, estado y registros actuales. Cada endpoint vuelve a validar sus permisos al ejecutar la acción.',
  })
  acciones_disponibles: AccionesSesionResponseDto;
}
