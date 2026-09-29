import { IsIn, IsOptional, Matches } from 'class-validator';
import { type resultado_cierre_enum } from '../../generated/prisma/client';

const RESULTADOS = ['COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA'] as const;

export class DeclararCierreDto {
  @IsIn(RESULTADOS)
  resultado_declarado: resultado_cierre_enum;

  @IsOptional()
  @Matches(/^[1-9][0-9]{0,18}$/, {
    message:
      'id_usuario_inasistente debe ser un entero positivo enviado como texto',
  })
  id_usuario_inasistente?: string;
}
