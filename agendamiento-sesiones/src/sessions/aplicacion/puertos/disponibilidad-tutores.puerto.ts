export interface BloqueDisponible {
  id_tutor: bigint;
  id_bloque: bigint;
  inicio: Date;
  fin: Date;
}

export interface DisponibilidadTutores {
  consultarBloque(
    idTutor: bigint,
    idMateria: bigint,
    idBloque: bigint,
  ): Promise<BloqueDisponible>;
  reservar(idBloque: bigint): Promise<void>;
  liberar(idBloque: bigint): Promise<void>;
}
