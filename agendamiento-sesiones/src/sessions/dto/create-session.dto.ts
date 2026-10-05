import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    description: 'ID del tutor asignado a la sesión',
    example: '12345',
  })
  @Matches(/^[1-9][0-9]{0,18}$/, {
    message:
      'id_tutor debe ser un entero positivo enviado como texto, de hasta 19 dígitos',
  })
  @IsNotEmpty({ message: 'id_tutor no debe estar vacío' })
  @IsString()
  id_tutor: string;

  @ApiProperty({
    description: 'ID del estudiante (tutee) que solicita la tutoría',
    example: '67890',
  })
  @Matches(/^[1-9][0-9]{0,18}$/, {
    message:
      'id_tutee debe ser un entero positivo enviado como texto, de hasta 19 dígitos',
  })
  @IsNotEmpty({ message: 'id_tutee no debe estar vacío' })
  @IsString()
  id_tutee: string;

  @ApiProperty({
    description: 'ID de la materia asociada a la sesión',
    example: '101',
  })
  @Matches(/^[1-9][0-9]{0,18}$/, {
    message:
      'id_materia debe ser un entero positivo enviado como texto, de hasta 19 dígitos',
  })
  @IsNotEmpty({ message: 'id_materia no debe estar vacío' })
  @IsString()
  id_materia: string;

  @ApiProperty({
    description: 'ID del bloque horario de la sesión',
    example: '2',
  })
  @Matches(/^[1-9][0-9]{0,18}$/, {
    message:
      'id_bloque debe ser un entero positivo enviado como texto, de hasta 19 dígitos',
  })
  @IsNotEmpty({ message: 'id_bloque no debe estar vacío' })
  @IsString()
  id_bloque: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio de la sesión (ISO 8601)',
    example: '2026-10-10T14:00:00.000Z',
  })
  @IsNotEmpty({ message: 'fechaInicio no debe estar vacía' })
  @IsDateString(
    {},
    { message: 'fechaInicio debe ser una fecha ISO 8601 válida' },
  )
  fechaInicio: string;

  @ApiProperty({
    description: 'Fecha y hora de término de la sesión (ISO 8601)',
    example: '2026-10-10T15:00:00.000Z',
  })
  @IsNotEmpty({ message: 'fechaFin no debe estar vacía' })
  @IsDateString({}, { message: 'fechaFin debe ser una fecha ISO 8601 válida' })
  fechaFin: string;

  @ApiPropertyOptional({
    description: 'Notas adicionales o tema a tratar en la sesión',
    example: 'Revisión de ejercicios de cálculo de subredes e IP',
  })
  @IsOptional()
  @IsString({ message: 'notas debe ser una cadena de texto' })
  notas?: string;
}