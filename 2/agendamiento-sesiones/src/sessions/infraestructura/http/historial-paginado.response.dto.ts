import { ApiProperty, OmitType } from '@nestjs/swagger';
import { DetalleSesionResponseDto } from './detalle-sesion.response.dto';

export class SesionHistorialResponseDto extends OmitType(DetalleSesionResponseDto, [
  'datos_encuentro', 'declaraciones', 'acciones_disponibles',
] as const) {}

export class HistorialPaginadoResponseDto {
  @ApiProperty({ type: [SesionHistorialResponseDto] })
  items: SesionHistorialResponseDto[];

  @ApiProperty({ type: Number, minimum: 0 })
  total: number;

  @ApiProperty({ type: Number, minimum: 1 })
  page: number;

  @ApiProperty({ type: Number, minimum: 1, maximum: 100 })
  limit: number;

  @ApiProperty({ type: Number, minimum: 0 })
  totalPages: number;
}
