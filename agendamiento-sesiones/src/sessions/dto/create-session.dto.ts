import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsUUID('4', { message: 'id_tutee debe ser un UUID valido' })
  @IsNotEmpty({ message: 'id_tutee no debe estar vacio' })
  id_tutee: string;

  @IsUUID('4', { message: 'id_tutor debe ser un UUID valido' })
  @IsNotEmpty({ message: 'id_tutor no debe estar vacio' })
  id_tutor: string;

  @IsUUID('4', { message: 'id_materia debe ser un UUID valido' })
  @IsNotEmpty({ message: 'id_materia no debe estar vacio' })
  id_materia: string;

  @IsUUID('4', { message: 'id_bloque debe ser un UUID valido' })
  @IsNotEmpty({ message: 'id_bloque no debe estar vacio' })
  id_bloque: string;
}