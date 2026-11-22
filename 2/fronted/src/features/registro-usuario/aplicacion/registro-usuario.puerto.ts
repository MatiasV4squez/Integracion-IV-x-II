import type { DatosRegistroUsuario } from '../models/datos-registro'

export interface ResultadoRegistroUsuario {
  correo: string
  verificacion: 'ENLACE_GENERADO' | 'PENDIENTE_ENVIO'
}

export interface RegistroUsuarioPuerto {
  registrar(datos: DatosRegistroUsuario, signal: AbortSignal): Promise<ResultadoRegistroUsuario>
}

export class ErrorRegistro extends Error {
  readonly estado: 'invalido' | 'duplicado' | 'error'
  constructor(estado: ErrorRegistro['estado']) {
    super('No se pudo completar el registro de la cuenta.')
    this.estado = estado
  }
}
