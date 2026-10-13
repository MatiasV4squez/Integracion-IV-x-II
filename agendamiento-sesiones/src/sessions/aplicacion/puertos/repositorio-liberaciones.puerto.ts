export interface LiberacionPendiente {
  id_sesion: bigint;
  id_bloque: bigint;
  fecha_liberacion: Date | null;
}

export interface RepositorioLiberaciones {
  registrarPendiente(idSesion: bigint, idBloque: bigint): Promise<void>;
  buscar(idSesion: bigint): Promise<LiberacionPendiente | null>;
  consultarPendientes(limite: number): Promise<Array<{ id_sesion: bigint }>>;
  registrarIntento(
    idSesion: bigint,
    fechaLiberacion?: Date,
    error?: string,
  ): Promise<void>;
}
