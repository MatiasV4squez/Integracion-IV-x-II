import { obtenerUrlApi } from '../../../config/api'
import { esIdentificador } from '../../../shared/utils/identificadores'
import type { Materia } from '../models/materia'

export class ErrorConsultaMaterias extends Error {
  constructor(mensaje: string, options?: ErrorOptions) {
    super(mensaje, options)
    this.name = 'ErrorConsultaMaterias'
  }
}

const TIEMPO_ESPERA_MS = 10000

export function esMateria(valor: unknown): valor is Materia {
  if (typeof valor !== 'object' || valor === null) return false
  return 'idMateria' in valor && esIdentificador(valor.idMateria)
    && 'codigo' in valor && typeof valor.codigo === 'string' && valor.codigo.trim().length > 0
    && 'nombre' in valor && typeof valor.nombre === 'string' && valor.nombre.trim().length > 0
}

export function esCatalogoValido(datos: unknown): datos is Materia[] {
  return Array.isArray(datos) && datos.every(esMateria)
    && new Set(datos.map((materia) => materia.codigo)).size === datos.length
    && new Set(datos.map((materia) => materia.idMateria)).size === datos.length
}

// Consulta directa a la API; la reutilización entre pantallas la gestiona aplicacion/catalogo-materias.
export async function obtenerMaterias(opciones: { signal?: AbortSignal } = {}): Promise<Materia[]> {
  opciones.signal?.throwIfAborted()

  // El Gateway dispone de 5 s para responder; el navegador concede margen al transporte.
  const signal = AbortSignal.any([
    AbortSignal.timeout(TIEMPO_ESPERA_MS),
    ...(opciones.signal ? [opciones.signal] : []),
  ])

  try {
    const respuesta = await fetch(obtenerUrlApi('materias-tutores/materias'), {
      signal,
      headers: { Accept: 'application/json' },
    })

    if (!respuesta.ok) {
      const mensaje = respuesta.status === 401
        ? 'Necesitas iniciar sesión para consultar las materias.'
        : respuesta.status === 403
          ? 'No tienes permiso para consultar las materias.'
          : 'El catálogo no está disponible en este momento. Inténtalo nuevamente.'
      throw new ErrorConsultaMaterias(mensaje)
    }

    const datos: unknown = await respuesta.json()
    if (!esCatalogoValido(datos)) {
      throw new ErrorConsultaMaterias('No pudimos leer el catálogo. Inténtalo nuevamente.')
    }

    return datos.map(({ idMateria, codigo, nombre }) => ({ idMateria, codigo, nombre }))
  } catch (error) {
    if (opciones.signal?.aborted) throw error
    if (error instanceof ErrorConsultaMaterias) throw error
    if (signal.aborted) {
      throw new ErrorConsultaMaterias('La consulta tardó demasiado. Inténtalo de nuevo.', { cause: error })
    }
    throw new ErrorConsultaMaterias('No pudimos conectar con el catálogo. Inténtalo de nuevo.', { cause: error })
  }
}
