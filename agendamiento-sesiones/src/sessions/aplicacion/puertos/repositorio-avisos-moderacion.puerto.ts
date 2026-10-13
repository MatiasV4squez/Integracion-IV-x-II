import type { AvisoModeracion, ContenidoAvisoModeracion } from '../contratos/avisos-moderacion';

export interface RepositorioAvisosModeracion {
  registrarPendiente(contenido: ContenidoAvisoModeracion): Promise<bigint>;
  buscar(idAviso: bigint): Promise<AvisoModeracion | null>;
  existeConflictoPendiente(idSesion: bigint): Promise<boolean>;
  consultarPendientes(limite: number): Promise<Array<{ id_aviso: bigint }>>;
  registrarIntento(
    idAviso: bigint,
    fechaEntrega?: Date,
    error?: string,
  ): Promise<void>;
}
