export class ErrorConsultaSesiones extends Error {
  readonly tipo: 'sesion' | 'permiso' | 'consulta'
  constructor(mensaje: string, tipo: ErrorConsultaSesiones['tipo'] = 'consulta', options?: ErrorOptions) {
    super(mensaje, options)
    this.name = 'ErrorConsultaSesiones'
    this.tipo = tipo
  }
}

export class ErrorAceptarSolicitud extends Error {
  readonly tipo: 'sesion' | 'permiso' | 'conflicto' | 'ausente' | 'incierto' | 'solicitud'
  constructor(mensaje: string, tipo: ErrorAceptarSolicitud['tipo'], options?: ErrorOptions) {
    super(mensaje, options)
    this.name = 'ErrorAceptarSolicitud'
    this.tipo = tipo
  }
}
