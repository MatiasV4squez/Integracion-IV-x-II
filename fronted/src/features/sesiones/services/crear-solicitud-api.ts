import type { SeleccionTutoria, SesionCreada } from '../models/solicitud-tutoria'
import { prepararSolicitudTutoria } from '../utils/preparar-solicitud-tutoria'
const urlApi = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'
).replace(/\/$/, '')

export async function crearSolicitudTutoria(seleccion: SeleccionTutoria,token: string,): Promise<SesionCreada> {
  const solicitud = prepararSolicitudTutoria(seleccion)
  const respuesta = await fetch(
    `${urlApi}/agendamiento-sesiones/sessions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(solicitud),
    },
  )

  const datos = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    const mensaje = datos?.message
    throw new Error(
      Array.isArray(mensaje)
        ? mensaje.join(' ')
        : typeof mensaje === 'string'
          ? mensaje
          : 'No se pudo crear la solicitud de tutoría.',
    )
  }

  if (!datos?.id_sesion || !datos?.estado_sesion) {
    throw new Error('La API devolvió una respuesta inesperada.')
  }

  return datos
}
