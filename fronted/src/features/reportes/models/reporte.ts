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

export const ESTADOS_REPORTE = ['PENDIENTE', 'DESESTIMADO', 'ADVERTIDO', 'SUSPENDIDO'] as const
export type EstadoReporte = (typeof ESTADOS_REPORTE)[number]

export const RESOLUCIONES_REPORTE = ['DESESTIMADO', 'ADVERTIDO', 'SUSPENDIDO'] as const
export type ResolucionReporte = (typeof RESOLUCIONES_REPORTE)[number]

export const RESULTADOS_CIERRE = ['COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA'] as const
export type ResultadoCierre = (typeof RESULTADOS_CIERRE)[number]

export const LIMITE_REPORTES_POR_PAGINA = 10

export type AccionModeracion = 'resolver' | 'reactivar'

export interface Reporte {
  id: number
  titulo: string
  descripcion: string
  estado: EstadoReporte
  idSesion: string
  usuarioReportadorId: string
  usuarioReportadoId: string
  motivo: string | null
  resueltoPorId: string | null
  resueltoEn: string | null
  reactivadoPorId: string | null
  reactivadoEn: string | null
  creadoEn: string
}

export interface PaginacionReportes {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

export interface DeclaracionCierreConflicto {
  idDeclaracion: string
  idUsuario: string
  resultadoDeclarado: ResultadoCierre
  idUsuarioInasistente: string | null
  fechaDeclaracion: string
}

export interface ConflictoSesionPendiente {
  idAviso: string
  fechaAviso: string
  idSesion: string
  idTutor: string
  idTutee: string
  idMateria: string
  fechaConflicto: string
  declaraciones: DeclaracionCierreConflicto[]
}

export type ConsultaReportes =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | {
      estado: 'listo'
      reportes: Reporte[]
      paginacion: PaginacionReportes
      conflictos: ConflictoSesionPendiente[]
    }

export interface FiltrosReportes {
  estado?: EstadoReporte
  fechaDesde?: string
  fechaHasta?: string
  pagina: number
}
