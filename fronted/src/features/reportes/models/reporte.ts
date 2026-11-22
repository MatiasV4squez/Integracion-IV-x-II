export interface DatosReporte {
  titulo: string
  descripcion: string
  id_sesion: string
  id_usuario_reportado: string
}

export type EstadoEnvioReporte =
  | { estado: 'inicial' }
  | { estado: 'enviando' }
  | { estado: 'enviado' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'incierto'; mensaje: string }