import type { TutorDisponible } from '../types/seleccion-tutoria'

const urlApi = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'
).replace(/\/$/, '')

export async function obtenerTutores(
  idMateria: string,
  signal: AbortSignal,
): Promise<TutorDisponible[]> {
  const respuesta = await fetch(
    `${urlApi}/materias-tutores/tutores?materiaId=${encodeURIComponent(idMateria)}`,
    { signal },
  )

  if (!respuesta.ok) {
    throw new Error('No se pudieron cargar los tutores.')
  }

  const datos = await respuesta.json()

  if (!Array.isArray(datos.items)) {
    throw new Error('La API devolvió una respuesta inesperada.')
  }

  return datos.items
}