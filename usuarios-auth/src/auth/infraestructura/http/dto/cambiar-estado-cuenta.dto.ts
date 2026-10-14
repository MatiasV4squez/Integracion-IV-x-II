import { IsIn } from 'class-validator';
import { ESTADOS_CUENTA_MODERABLES } from '../../../dominio/auth.ports';
import type { EstadoCuentaModerable } from '../../../dominio/auth.ports';

export class CambiarEstadoCuentaDto {
  @IsIn(ESTADOS_CUENTA_MODERABLES)
  estado: EstadoCuentaModerable;
}
