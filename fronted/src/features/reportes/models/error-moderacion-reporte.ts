import type { AccionModeracion } from './reporte'

export type TipoErrorModeracion = 'validacion' | 'sesion' | 'permiso' | 'no-encontrado'
  | 'conflicto' | 'cuenta-no-actualizada' | 'verificacion-servidor' | 'resultado-incierto'
  | 'en-curso' | 'configuracion'

export class ErrorModeracionReporte extends Error {
  readonly tipo: TipoErrorModeracion
  readonly accion: AccionModeracion
  readonly estadoHttp?: number
  readonly requiereActualizar: boolean

  constructor(mensaje: string, tipo: TipoErrorModeracion, accion: AccionModeracion,
    opciones?: ErrorOptions & { estadoHttp?: number }) {
    super(mensaje, opciones)
    this.name = 'ErrorModeracionReporte'
    this.tipo = tipo
    this.accion = accion
    this.estadoHttp = opciones?.estadoHttp
    this.requiereActualizar = ['no-encontrado', 'conflicto', 'resultado-incierto'].includes(tipo)
  }
}
