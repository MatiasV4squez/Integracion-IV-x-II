import { obtenerUrlApi } from '../../../config/api'
import type { SeleccionTutoria, SesionCreada } from '../models/solicitud-tutoria'
import { prepararSolicitudTutoria } from '../utils/preparar-solicitud-tutoria'

// Códigos documentados por agendamiento-sesiones para POST /sessions.
const MENSAJES: Record<number, string> = {
  400: 'La solicitud no es válida. Revisa el tutor y el horario seleccionados.',
  401: 'Tu sesión no es válida o ha vencido. Inicia sesión nuevamente.',
  404: 'El horario seleccionado ya no está disponible. Elige otro bloque.',
  409: 'No pudimos reservar el horario: ya no está disponible, se cruza con otra tutoría o ya tienes cuatro solicitudes pendientes.',
  503: 'El servicio de agendamiento no está disponible en este momento. Inténtalo más tarde.',
  504: 'La solicitud tardó demasiado. Revisa Mi panel antes de volver a intentarlo.',
}

export class ErrorCrearSolicitud extends Error {
  readonly estado: number | null
  constructor(mensaje: string, estado: number | null = null) {
    super(mensaje)
    this.name = 'ErrorCrearSolicitud'
    this.estado = estado
  }

  // Tras estos rechazos los bloques mostrados pueden estar desactualizados.
  get requiereRecargarHorarios() {
    return this.estado === 404 || this.estado === 409
  }
}

export async function crearSolicitudTutoria(
  seleccion: SeleccionTutoria, token: string, externa?: AbortSignal,
): Promise<SesionCreada> {
  externa?.throwIfAborted()
  const solicitud = prepararSolicitudTutoria(seleccion)
  const signal = AbortSignal.any([AbortSignal.timeout(15000), ...(externa ? [externa] : [])])

  let respuesta: Response
  try {
    respuesta = await fetch(obtenerUrlApi('agendamiento-sesiones/sessions'), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(solicitud),
      signal,
    })
  } catch (error) {
    if (externa?.aborted) throw error
    // Sin respuesta no se sabe si la reserva se creó: se indica revisar antes de reintentar.
    throw new ErrorCrearSolicitud(signal.aborted
      ? MENSAJES[504] : 'No pudimos conectar con el servidor. Revisa Mi panel antes de volver a intentarlo.')
  }

  if (respuesta.status !== 201) {
    throw new ErrorCrearSolicitud(MENSAJES[respuesta.status] ?? 'No se pudo crear la solicitud de tutoría. Inténtalo más tarde.', respuesta.status)
  }
  const datos: unknown = await respuesta.json().catch(() => null)
  if (!datos || typeof datos !== 'object' || !('id_sesion' in datos) || typeof datos.id_sesion !== 'string'
    || !('estado_sesion' in datos) || typeof datos.estado_sesion !== 'string') {
    throw new ErrorCrearSolicitud('La solicitud se envió, pero la respuesta no es válida. Revisa Mi panel.')
  }
  return { id_sesion: datos.id_sesion, estado_sesion: datos.estado_sesion }
}
