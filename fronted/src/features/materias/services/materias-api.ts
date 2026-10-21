import { obtenerUrlApi } from '../../../config/api'
import { esIdentificador } from '../../../shared/utils/identificadores'
import type { Materia } from '../models/materia'

interface ObtenerMateriasOpciones {
  signal?: AbortSignal
  forzarRecarga?: boolean
}

export class ErrorConsultaMaterias extends Error {
  constructor(mensaje: string, options?: ErrorOptions) {
    super(mensaje, options)
    this.name = 'ErrorConsultaMaterias'
  }
}

const DURACION_CACHE_MS = 5 * 60 * 1000
const TIEMPO_ESPERA_MS = 10000
let cache: { materias: Materia[]; vence: number } | undefined

function esMateria(valor: unknown): valor is Materia {
  if (typeof valor !== 'object' || valor === null) return false
  return 'idMateria' in valor && esIdentificador(valor.idMateria)
    && 'codigo' in valor && typeof valor.codigo === 'string' && valor.codigo.trim().length > 0
    && 'nombre' in valor && typeof valor.nombre === 'string' && valor.nombre.trim().length > 0
}

export async function obtenerMaterias(opciones: ObtenerMateriasOpciones = {}): Promise<Materia[]> {
  opciones.signal?.throwIfAborted()
  if (!opciones.forzarRecarga && cache && cache.vence > Date.now()) {
    return cache.materias.map((materia) => ({ ...materia }))
  }

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
    if (!Array.isArray(datos) || !datos.every(esMateria)
      || new Set(datos.map((materia) => materia.codigo)).size !== datos.length
      || new Set(datos.map((materia) => materia.idMateria)).size !== datos.length) {
      throw new ErrorConsultaMaterias('No pudimos leer el catálogo. Inténtalo nuevamente.')
    }

    const materias = datos.map(({ idMateria, codigo, nombre }) => ({ idMateria, codigo, nombre }))
    cache = { materias, vence: Date.now() + DURACION_CACHE_MS }
    return materias.map((materia) => ({ ...materia }))
  } catch (error) {
    if (opciones.signal?.aborted) throw error
    if (error instanceof ErrorConsultaMaterias) throw error
    if (signal.aborted) {
      throw new ErrorConsultaMaterias('La consulta tardó demasiado. Inténtalo de nuevo.', { cause: error })
    }
    throw new ErrorConsultaMaterias('No pudimos conectar con el catálogo. Inténtalo de nuevo.', { cause: error })
  }
}
