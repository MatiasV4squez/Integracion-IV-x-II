import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum SessionStatus {
  ACEPTADA = 'ACEPTADA',
  RECHAZADA = 'RECHAZADA',
  CANCELADA = 'CANCELADA',
}

export class UpdateSessionStatusDto {
  @IsNotEmpty()
  @IsString()
  id_tutor: string;

  @IsNotEmpty()
  @IsEnum(SessionStatus)
  estado: SessionStatus;
}