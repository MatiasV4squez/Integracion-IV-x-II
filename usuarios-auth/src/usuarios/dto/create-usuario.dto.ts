// Agustin Addon

import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail({}, { message: 'Debe ser un correo válido' })
  @Matches(/@alu\.uct\.cl$/, { message: 'El correo debe ser institucional (@alu.uct.cl)' })
  @IsNotEmpty()
  correo_institucional: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @IsNotEmpty()
  password_hash: string;
}