import type { ErrorAceptarSolicitud } from './error-sesiones'
import type { ConsultaSolicitudes } from './sesion'

export type AceptacionSolicitud =
  | { estado: 'inicial' }
  | { estado: 'aceptando'; idSesion: string }
  | { estado: 'aceptada'; idSesion: string }
  | { estado: 'error'; idSesion: string; mensaje: string; tipo: ErrorAceptarSolicitud['tipo'] }

export interface EstadoBandejaSolicitudes {
  consulta: ConsultaSolicitudes
  actualizando: boolean
  errorActualizacion?: string
  aceptacion: AceptacionSolicitud
  necesitaActualizar: boolean
}
