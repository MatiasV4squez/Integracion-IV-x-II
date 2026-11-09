export interface VerificacionRegistro {
  solicitarVerificacion(idUsuario: bigint, correo: string): Promise<void>;
}
