import { IsInt, Max, Min } from 'class-validator';

export class CalificarSesionDto {
  @IsInt()
  @Min(1)
  @Max(5)
  puntuacion: number;
}
