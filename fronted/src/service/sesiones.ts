import type { SeleccionTutoria } from '../types/seleccion-tutoria'

export interface SesionCreada {
  id_sesion: string
  estado_sesion: string
}

const urlApi = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'
).replace(/\/$/, '')

export async function crearSolicitudTutoria(
  seleccion: SeleccionTutoria,
  token: string,
): Promise<SesionCreada> {
  const respuesta = await fetch(
    `${urlApi}/agendamiento-sesiones/sessions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id_tutor: seleccion.id_tutor,
        id_materia: seleccion.id_materia,
        id_bloque: seleccion.id_bloque,
      }),
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