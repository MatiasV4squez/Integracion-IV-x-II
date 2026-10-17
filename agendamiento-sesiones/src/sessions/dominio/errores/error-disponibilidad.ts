import { ErrorSesion, type MotivoErrorSesion } from './error-sesion';

export class ErrorDisponibilidad extends ErrorSesion {
  constructor(motivo: MotivoErrorSesion, mensaje: string) {
    super(motivo, mensaje);
    this.name = 'ErrorDisponibilidad';
  }
}
