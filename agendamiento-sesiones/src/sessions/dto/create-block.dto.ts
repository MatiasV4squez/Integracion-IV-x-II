import { IsDateString, IsNotEmpty, Matches } from 'class-validator';

export class CreateBlockDto {
  @Matches(/^[1-9][0-9]{0,18}$/, {
    message:
      'id_tutor debe ser un entero positivo enviado como texto, de hasta 19 dígitos',
  })
  @IsNotEmpty({ message: 'id_tutor no debe estar vacio' })
  id_tutor: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dia debe tener formato YYYY-MM-DD',
  })
  @IsDateString({ strict: true }, { message: 'dia debe ser una fecha válida' })
  @IsNotEmpty({ message: 'dia no debe estar vacio' })
  dia: string;

  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'hora_inicio debe ser formato HH:mm',
  })
  @IsNotEmpty({ message: 'hora_inicio no debe estar vacia' })
  hora_inicio: string;

  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'hora_fin debe ser formato HH:mm',
  })
  @IsNotEmpty({ message: 'hora_fin no debe estar vacia' })
  hora_fin: string;
}
