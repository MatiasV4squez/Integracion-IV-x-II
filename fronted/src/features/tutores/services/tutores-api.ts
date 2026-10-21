import { obtenerUrlApi } from '../../../config/api'
import { esIdentificador } from '../../../shared/utils/identificadores'
import type { ResultadoBusquedaTutores } from '../models/resultado-busqueda-tutores'
import { esResultadoBusqueda } from '../utils/validar-resultado-busqueda'

interface BuscarTutoresOpciones {
  materiaId: string
  page?: number
  limit?: number
  signal?: AbortSignal
}

export class ErrorConsultaTutores extends Error {
  constructor(mensaje: string, options?: ErrorOptions) {
    super(mensaje, options)
    this.name = 'ErrorConsultaTutores'
  }
}

const TIEMPO_ESPERA_MS = 10000

export async function buscarTutores({ materiaId, page = 1, limit = 10, signal: externa }: BuscarTutoresOpciones): Promise<ResultadoBusquedaTutores> {
  externa?.throwIfAborted()
  if (!esIdentificador(materiaId) || !Number.isSafeInteger(page) || page < 1
    || !Number.isSafeInteger(limit) || limit < 1 || limit > 100
    || !Number.isSafeInteger((page - 1) * limit)) {
    throw new ErrorConsultaTutores('La búsqueda no es válida. Selecciona una materia y vuelve a intentarlo.')
  }

  // El Gateway dispone de 5 s para responder; se concede margen al transporte.
  const signal = AbortSignal.any([AbortSignal.timeout(TIEMPO_ESPERA_MS), ...(externa ? [externa] : [])])
  const parametros = new URLSearchParams({ materiaId, page: String(page), limit: String(limit) })

  try {
    const respuesta = await fetch(obtenerUrlApi('materias-tutores/tutores') + '?' + parametros, {
      signal,
      headers: { Accept: 'application/json' },
    })

    if (!respuesta.ok) {
      const mensajes: Record<number, string> = {
        400: 'La búsqueda no es válida. Selecciona una materia y vuelve a intentarlo.',
        401: 'Necesitas iniciar sesión para buscar tutores.',
        403: 'No tienes permiso para consultar los tutores.',
        504: 'La búsqueda tardó demasiado. Inténtalo de nuevo.',
      }
      throw new ErrorConsultaTutores(mensajes[respuesta.status]
        ?? 'No pudimos consultar los tutores. Inténtalo de nuevo.')
    }

    let datos: unknown
    try {
      datos = await respuesta.json()
    } catch (error) {
      if (signal.aborted) throw error
      throw new ErrorConsultaTutores('No pudimos leer los resultados. Inténtalo de nuevo.', { cause: error })
    }
    if (!esResultadoBusqueda(datos, page, limit)) {
      throw new ErrorConsultaTutores('No pudimos leer los resultados. Inténtalo de nuevo.')
    }

    // Se conservan únicamente los campos del contrato público, sin datos ficticios.
    return {
      total: datos.total, page: datos.page, limit: datos.limit, totalPages: datos.totalPages,
      items: datos.items.map(({ idTutor, promedioCalificaciones, cantidadCalificaciones, horariosDisponibles }) => ({
        idTutor, promedioCalificaciones, cantidadCalificaciones,
        horariosDisponibles: horariosDisponibles.map(({ idBloque, dia, horaInicio, horaFin }) => ({ idBloque, dia, horaInicio, horaFin })),
      })),
    }
  } catch (error) {
    if (externa?.aborted) throw error
    if (error instanceof ErrorConsultaTutores) throw error
    if (signal.aborted) {
      throw new ErrorConsultaTutores('La búsqueda tardó demasiado. Inténtalo de nuevo.', { cause: error })
    }
    throw new ErrorConsultaTutores('No pudimos conectar para buscar tutores. Inténtalo de nuevo.', { cause: error })
  }
}
