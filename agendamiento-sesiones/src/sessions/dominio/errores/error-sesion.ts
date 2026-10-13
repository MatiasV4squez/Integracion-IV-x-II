export type MotivoErrorSesion =
  | 'ENTRADA_INVALIDA'
  | 'CONFLICTO'
  | 'PROHIBIDO'
  | 'NO_ENCONTRADA'
  | 'DEPENDENCIA_NO_DISPONIBLE';

export class ErrorSesion extends Error {
  constructor(
    public readonly motivo: MotivoErrorSesion,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorSesion';
  }
}
