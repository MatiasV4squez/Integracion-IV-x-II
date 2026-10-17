import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import type { EstadoDisponibilidad } from '../../../dominio/tipos/estado-disponibilidad';

export class EditarDisponibilidadDto {
  @ApiPropertyOptional({
    example: '10:00',
    description: 'Nueva hora de inicio en formato HH:MM (America/Santiago).',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'hora_inicio debe tener formato HH:MM.',
  })
  hora_inicio?: string;

  @ApiPropertyOptional({
    example: '11:00',
    description: 'Nueva hora de término en formato HH:MM (America/Santiago).',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'hora_fin debe tener formato HH:MM.',
  })
  hora_fin?: string;

  @ApiPropertyOptional({
    enum: ['DISPONIBLE', 'RESERVADO', 'NO_DISPONIBLE'],
    example: 'DISPONIBLE',
    description: 'Nuevo estado del bloque.',
  })
  @IsOptional()
  @IsEnum(['DISPONIBLE', 'RESERVADO', 'NO_DISPONIBLE'], {
    message: 'estado debe ser DISPONIBLE, RESERVADO o NO_DISPONIBLE.',
  })
  estado?: EstadoDisponibilidad;
}
