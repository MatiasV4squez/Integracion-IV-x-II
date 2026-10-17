import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import type { EstadoDisponibilidad } from '../../../dominio/tipos/estado-disponibilidad';

export class ConsultarDisponibilidadDto {
  @ApiPropertyOptional({
    enum: ['DISPONIBLE', 'RESERVADO', 'NO_DISPONIBLE'],
    example: 'DISPONIBLE',
    description: 'Filtrar por estado del bloque.',
  })
  @IsOptional()
  @IsEnum(['DISPONIBLE', 'RESERVADO', 'NO_DISPONIBLE'], {
    message: 'estado debe ser DISPONIBLE, RESERVADO o NO_DISPONIBLE.',
  })
  estado?: EstadoDisponibilidad;

  @ApiPropertyOptional({
    example: '2027-07-15',
    description:
      'Filtrar por fecha del bloque en formato YYYY-MM-DD (America/Santiago).',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dia debe tener formato YYYY-MM-DD.',
  })
  dia?: string;
}
