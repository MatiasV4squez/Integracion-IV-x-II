import type { DatosRegistroUsuario } from '../models/datos-registro'

export interface RegistroUsuarioPuerto {
  registrar(datos: DatosRegistroUsuario, signal: AbortSignal): Promise<void>
}

export class ErrorRegistro extends Error {
  readonly estado: 'invalido' | 'duplicado' | 'error'
  constructor(estado: ErrorRegistro['estado']) {
    super('No se pudo completar el registro de la cuenta.')
    this.estado = estado
  }
}
