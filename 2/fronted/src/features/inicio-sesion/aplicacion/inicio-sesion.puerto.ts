import type { ResultadoInicioSesion } from '../../../shared/auth/usuario-autenticado'
import type { CredencialesInicioSesion } from '../models/credenciales'

export interface InicioSesionPuerto {
  iniciarSesion(credenciales: CredencialesInicioSesion, signal: AbortSignal): Promise<ResultadoInicioSesion>
  cerrarSesion(token: string, signal: AbortSignal): Promise<void>
}

export class ErrorInicioSesion extends Error {
  readonly estado: 'invalido' | 'credenciales' | 'pendiente' | 'suspendida' | 'inactiva' | 'error'
  constructor(estado: ErrorInicioSesion['estado']) {
    super('No se pudo iniciar sesión.')
    this.estado = estado
  }
}
