import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CorreoInstitucionalDto } from './correo-institucional.dto';

export class LoginDto extends CorreoInstitucionalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
