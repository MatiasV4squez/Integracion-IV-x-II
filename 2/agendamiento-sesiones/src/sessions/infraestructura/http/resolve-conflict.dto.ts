import { IsEnum, IsNotEmpty, IsString, IsOptional, Matches, MaxLength } from 'class-validator';

export enum EstadoResolucionAdmin {
  COMPLETADA = 'COMPLETADA',
  NO_REALIZADA = 'NO_REALIZADA',
  INASISTENCIA = 'INASISTENCIA',
}

export class ResolveConflictDto {
  @IsEnum(EstadoResolucionAdmin, {
    message: 'El estado debe ser COMPLETADA, NO_REALIZADA o INASISTENCIA',
  })
  @IsNotEmpty()
  nuevo_estado: EstadoResolucionAdmin;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'El motivo debe contener texto.' })
  @MaxLength(500)
  motivo_resolucion: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
