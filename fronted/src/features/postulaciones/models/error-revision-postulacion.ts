import type { DecisionPostulacion } from './postulacion'

export type TipoErrorRevision = 'validacion' | 'sesion' | 'permiso' | 'no-encontrada'
  | 'conflicto' | 'resultado-incierto' | 'en-curso' | 'configuracion'

export class ErrorRevisionPostulacion extends Error {
  readonly tipo: TipoErrorRevision
  readonly decision: DecisionPostulacion
  readonly estadoHttp?: number
  readonly requiereActualizar: boolean

  constructor(mensaje: string, tipo: TipoErrorRevision, decision: DecisionPostulacion,
    opciones?: ErrorOptions & { estadoHttp?: number }) {
    super(mensaje, opciones)
    this.name = 'ErrorRevisionPostulacion'
    this.tipo = tipo
    this.decision = decision
    this.estadoHttp = opciones?.estadoHttp
    this.requiereActualizar = ['no-encontrada', 'conflicto', 'resultado-incierto'].includes(tipo)
  }
}
