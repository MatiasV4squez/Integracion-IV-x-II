import { obtenerUrlApi } from '../../../config/api'
import { esIdentificador } from '../../../shared/utils/identificadores'
import type { TutorBusqueda } from '../models/tutor-busqueda'

const IDS_POR_CONSULTA = 100
const TIEMPO_ESPERA_MS = 10000

export class ErrorNombresTutores extends Error {
  constructor(mensaje: string, options?: ErrorOptions) {
    super(mensaje, options)
    this.name = 'ErrorNombresTutores'
  }
}

function esDatoPublico(valor: unknown): valor is { id: string; nombre: string } {
  if (typeof valor !== 'object' || valor === null) return false
  const { id, nombre } = valor as Record<string, unknown>
  return esIdentificador(id) && typeof nombre === 'string'
}

export async function obtenerNombresUsuarios(ids: readonly string[], token: string, externa?: AbortSignal): Promise<Map<string, string>> {
  externa?.throwIfAborted()
  const unicos = [...new Set(ids)]
  if (!unicos.every(esIdentificador)) throw new ErrorNombresTutores('Los identificadores de tutores no son válidos.')

  const nombres = new Map<string, string>()
  for (let inicio = 0; inicio < unicos.length; inicio += IDS_POR_CONSULTA) {
    const lote = unicos.slice(inicio, inicio + IDS_POR_CONSULTA)
    const signal = AbortSignal.any([AbortSignal.timeout(TIEMPO_ESPERA_MS), ...(externa ? [externa] : [])])
    const respuesta = await fetch(obtenerUrlApi('usuarios-auth/usuarios') + '?' + new URLSearchParams({ ids: lote.join(',') }), {
      signal,
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    })
    if (!respuesta.ok) throw new ErrorNombresTutores('No pudimos consultar los nombres de los tutores.')

    let datos: unknown
    try {
      datos = await respuesta.json()
    } catch (error) {
      if (signal.aborted) throw error
      throw new ErrorNombresTutores('No pudimos leer los nombres de los tutores.', { cause: error })
    }
    if (!Array.isArray(datos) || !datos.every(esDatoPublico)) {
      throw new ErrorNombresTutores('No pudimos leer los nombres de los tutores.')
    }
    for (const { id, nombre } of datos) {
      if (lote.includes(id) && nombre.trim()) nombres.set(id, nombre.trim())
    }
  }
  return nombres
}

export async function completarNombresTutores(tutores: TutorBusqueda[], token: string | undefined, signal?: AbortSignal): Promise<TutorBusqueda[]> {
  if (!token || tutores.length === 0) return tutores
  try {
    const nombres = await obtenerNombresUsuarios(tutores.map((tutor) => tutor.idTutor), token, signal)
    return tutores.map((tutor) => {
      const nombre = nombres.get(tutor.idTutor)
      return nombre ? { ...tutor, nombre } : tutor
    })
  } catch (error) {
    if (signal?.aborted) throw error
    return tutores
  }
}
