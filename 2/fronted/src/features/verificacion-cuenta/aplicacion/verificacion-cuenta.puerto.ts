export interface VerificacionCuentaPuerto {
  confirmar(token: string, signal: AbortSignal): Promise<void>
  reenviar(correo: string, signal: AbortSignal): Promise<void>
}

export class ErrorVerificacion extends Error {
  readonly estado: 'invalida' | 'vencida' | 'utilizada' | 'error'
  constructor(estado: ErrorVerificacion['estado']) {
    super('No se pudo completar la verificación de correo.')
    this.estado = estado
  }
}
