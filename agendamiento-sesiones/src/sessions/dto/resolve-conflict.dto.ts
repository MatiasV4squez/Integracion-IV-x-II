import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export enum EstadoResolucionAdmin {
  RESOLVIDA = 'RESOLVIDA',
  CANCELADA = 'CANCELADA',
  RECHAZADA = 'RECHAZADA',
}

export class ResolveConflictDto {
  @IsEnum(EstadoResolucionAdmin, {
    message: 'El estado debe ser RESOLVIDA, CANCELADA o RECHAZADA',
  })
  @IsNotEmpty()
  nuevo_estado: EstadoResolucionAdmin;

  @IsString()
  @IsNotEmpty()
  motivo_resolucion: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}