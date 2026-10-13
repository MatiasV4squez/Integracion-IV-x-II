export interface Reloj {
  ahora(): Date;
}

export interface RegistroAplicacion {
  error(mensaje: string): void;
}

export interface EntregaReputacion {
  enviarCalificacion(idCalificacion: bigint): Promise<boolean>;
}

export interface LiberacionBloques {
  procesar(idSesion: bigint): Promise<boolean>;
}

export interface EntregaAvisosModeracion {
  procesar(idAviso: bigint): Promise<boolean>;
}
