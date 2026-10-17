import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CrearDisponibilidadDto {
  @ApiProperty({
    example: '2027-07-15',
    description:
      'Fecha del bloque en formato YYYY-MM-DD, zona horaria America/Santiago.',
  })
  @IsNotEmpty({ message: 'dia no debe estar vacío' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dia debe tener formato YYYY-MM-DD.',
  })
  dia: string;

  @ApiProperty({
    example: '10:00',
    description:
      'Hora de inicio en formato HH:MM, zona horaria America/Santiago.',
  })
  @IsNotEmpty({ message: 'hora_inicio no debe estar vacío' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'hora_inicio debe tener formato HH:MM.',
  })
  hora_inicio: string;

  @ApiProperty({
    example: '11:00',
    description:
      'Hora de término en formato HH:MM, zona horaria America/Santiago.',
  })
  @IsNotEmpty({ message: 'hora_fin no debe estar vacía' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'hora_fin debe tener formato HH:MM.',
  })
  hora_fin: string;
}
