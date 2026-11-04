import { ApiProperty } from '@nestjs/swagger';

export class PostulacionRespuestaDto {
  @ApiProperty({ example: '1' }) idPostulacion: string;
  @ApiProperty({ example: '10' }) idUsuario: string;
  @ApiProperty({ example: '2' }) idMateria: string;
  @ApiProperty({ type: String, nullable: true, example: null })
  idAdministradorRevision: string | null;
  @ApiProperty({ example: 'notas.pdf' }) certificadoNombre: string;
  @ApiProperty({ enum: ['application/pdf', 'image/png'] })
  certificadoTipo: string;
  @ApiProperty({ type: Number, nullable: true, example: 5.5 }) notaAcreditada:
    number | null;
  @ApiProperty({
    enum: ['PENDIENTE', 'PENDIENTE_ROL', 'APROBADA', 'RECHAZADA'],
  })
  estado: string;
  @ApiProperty({ type: String, format: 'date-time' }) fechaPostulacion: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  fechaRevision: Date | null;
  @ApiProperty({ type: String, nullable: true }) motivoRechazo: string | null;
}
