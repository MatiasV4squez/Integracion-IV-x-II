import { ApiProperty } from '@nestjs/swagger';

export class ReputacionRespuestaDto {
  @ApiProperty({ example: '10' }) idTutor: string;
  @ApiProperty({ example: 3 }) cantidadCalificaciones: number;
  @ApiProperty({ type: Number, nullable: true, example: 4.33 }) promedio:
    number | null;
  @ApiProperty({ enum: ['ACTIVO', 'EN_REVISION'] }) estado: string;
}
