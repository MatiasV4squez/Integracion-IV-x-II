import { ApiProperty } from '@nestjs/swagger';

export class SesionCreadaResponseDto {
  @ApiProperty({
    type: String,
    example: '100',
    description: 'ID BIGINT de la sesión enviado como texto.',
  })
  id_sesion: string;

  @ApiProperty({
    type: String,
    example: '20',
    description: 'Estudiante obtenido del JWT.',
  })
  id_tutee: string;

  @ApiProperty({ type: String, example: '10' })
  id_tutor: string;

  @ApiProperty({ type: String, example: '3' })
  id_materia: string;

  @ApiProperty({ type: String, example: '25' })
  id_bloque: string;

  @ApiProperty({ enum: ['PENDIENTE'], example: 'PENDIENTE' })
  estado_sesion: 'PENDIENTE';

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2027-07-15T14:00:00.000Z',
    description: 'Inicio del bloque convertido de America/Santiago a UTC.',
  })
  inicio: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2027-07-15T15:00:00.000Z',
  })
  fin: string;

  @ApiProperty({ type: String, format: 'date-time' })
  fecha_creacion: string;

  @ApiProperty({ type: String, format: 'date-time' })
  fecha_actualizacion: string;

  @ApiProperty({ type: Boolean, example: false })
  resultado_provisional: boolean;
}
