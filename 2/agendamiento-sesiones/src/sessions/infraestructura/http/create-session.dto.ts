import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

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
}
