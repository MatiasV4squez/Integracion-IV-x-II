import { IsIn } from 'class-validator';

export const ESTADOS_CUENTA_MODERABLES = ['SUSPENDIDO', 'ACTIVO'] as const;
export type EstadoCuentaModerable = (typeof ESTADOS_CUENTA_MODERABLES)[number];

export class CambiarEstadoCuentaDto {
  @IsIn(ESTADOS_CUENTA_MODERABLES)
  estado: EstadoCuentaModerable;
}
