import type { Sesion } from './sesion'

export interface CalificacionTutoria {
  id_calificacion: string
  id_sesion: string
  id_evaluador: string
  id_evaluado: string
  puntuacion: number
  fecha_calificacion: string
}

export interface Tutoria extends Sesion {
  calificaciones: CalificacionTutoria[]
}

export interface FiltrosTutorias {
  page: number
  limit: number
  rol: '' | 'ESTUDIANTE' | 'TUTOR'
  estado: '' | Sesion['estado_sesion']
}

export interface PaginaTutorias {
  items: Tutoria[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const RESULTADOS_CIERRE = ['COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA'] as const
export type ResultadoCierre = (typeof RESULTADOS_CIERRE)[number]
export type EntradaCierre =
  | { resultado_declarado: Exclude<ResultadoCierre, 'INASISTENCIA'> }
  | { resultado_declarado: 'INASISTENCIA'; id_usuario_inasistente: string }

export interface DeclaracionTutoria {
  id_declaracion: string
  id_sesion: string
  id_usuario: string
  resultado_declarado: ResultadoCierre
  id_usuario_inasistente: string | null
  fecha_declaracion: string
}

export interface DetalleTutoria extends Tutoria {
  datos_encuentro: { modalidad: 'PRESENCIAL' | 'EN_LINEA' | null; lugar: string | null; enlace: string | null }
  declaraciones: DeclaracionTutoria[]
  acciones_disponibles: {
    aceptar: boolean
    rechazar: boolean
    cancelar: boolean
    declarar_cierre: boolean
    calificar: boolean
    resolver_conflicto: boolean
  }
}

export type ConsultaTutorias<T> =
  | { estado: 'cargando' }
  | { estado: 'listo'; datos: T }
  | { estado: 'error'; mensaje: string; tipo: 'sesion' | 'permiso' | 'ausente' | 'consulta' }

export class ErrorConsultaTutorias extends Error {
  readonly tipo: 'sesion' | 'permiso' | 'ausente' | 'consulta'
  constructor(mensaje: string, tipo: ErrorConsultaTutorias['tipo'] = 'consulta', opciones?: ErrorOptions) {
    super(mensaje, opciones)
    this.name = 'ErrorConsultaTutorias'
    this.tipo = tipo
  }
}
