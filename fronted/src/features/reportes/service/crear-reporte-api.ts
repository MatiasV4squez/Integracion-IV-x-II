import { obtenerUrlApi } from '../../../config/api'
import type { DatosReporte } from '../models/reporte'

export class ErrorCrearReporte extends Error {
  readonly incierto: boolean

  constructor(mensaje: string, incierto = false) {
    super(mensaje)
    this.name = 'ErrorCrearReporte'
    this.incierto = incierto
  }
}

export async function crearReporte(datos: DatosReporte, token: string,): Promise<void> {
  if (!token.trim()) {
    throw new ErrorCrearReporte('Inicia sesión para enviar un reporte.')
  }

  const url = obtenerUrlApi('reportes-moderacion/reportes')
  let respuesta: Response

  try {
    respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(datos),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new ErrorCrearReporte(
      'Se perdió la conexión o terminó el tiempo de espera. No podemos confirmar si el reporte se guardó. Evita reenviarlo de inmediato.',
      true,
    )
  }

  if (respuesta.status === 201) return

  if (respuesta.status >= 500 || respuesta.status === 408 || respuesta.ok) {
    throw new ErrorCrearReporte(
      'No pudimos confirmar el resultado del envío. Evita reenviar el reporte de inmediato.',
      true,
    )
  }

  const mensajes: Record<number, string> = {
    400: 'Revisa los datos y el usuario seleccionado para el reporte.',
    401: 'Tu sesión no es válida o venció. Inicia sesión nuevamente.',
    403: 'No puedes reportar esta sesión. Debes haber participado y la sesión debe haber sido confirmada.',
    404: 'No se encontró el recurso solicitado.',
    429: 'Hay demasiadas solicitudes. Espera un momento antes de intentarlo.',
  }

  throw new ErrorCrearReporte(
    mensajes[respuesta.status] ?? 'No se pudo enviar el reporte.',
  )
}