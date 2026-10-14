import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class CorreoInstitucionalDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @MaxLength(255)
  correo_institucional: string;
}
