import type { AvisoModeracion } from '../contratos/avisos-moderacion';

export interface PublicadorModeracion {
  estaConfigurado(): boolean;
  publicar(aviso: AvisoModeracion): Promise<boolean>;
}
