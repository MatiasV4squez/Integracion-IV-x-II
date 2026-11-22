import type { DetalleSesion } from '../../dominio/entidades/detalle-sesion';

export interface RepositorioDetalleSesion {
  buscarPorId(idSesion: bigint): Promise<DetalleSesion | null>;
}
