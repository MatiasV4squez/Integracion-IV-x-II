import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class CreateBlockDto {
  @IsUUID('4', { message: 'id_tutor debe ser un UUID valido' })
  @IsNotEmpty({ message: 'id_tutor no debe estar vacio' })
  id_tutor: string;

  @IsString()
  @IsNotEmpty({ message: 'dia no debe estar vacio' })
  dia: string;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'hora_inicio debe ser formato HH:mm',
  })
  @IsNotEmpty({ message: 'hora_inicio no debe estar vacia' })
  hora_inicio: string;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'hora_fin debe ser formato HH:mm',
  })
  @IsNotEmpty({ message: 'hora_fin no debe estar vacia' })
  hora_fin: string;
}