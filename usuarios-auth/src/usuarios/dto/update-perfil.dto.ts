import { IsString, IsInt, IsOptional, MaxLength, Min } from 'class-validator';

export class UpdatePerfilDto {
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'La carrera no puede exceder los 150 caracteres' })
  carrera?: string;

  @IsOptional()
  @IsInt({ message: 'El semestre debe ser un número entero' })
  @Min(1, { message: 'El semestre mínimo es 1' })
  semestre_actual?: number;

  @IsOptional()
  @IsString()
  biografia?: string;
}