import type { TutorBusqueda } from '../models/tutor-busqueda'
import { buscarTutores } from './tutores-api'

const TUTORES_POR_PAGINA = 100
// Límite defensivo: 1 000 tutores por materia supera con holgura el volumen esperado.
const PAGINAS_MAXIMAS = 10

// Reutiliza la búsqueda validada y recorre todas sus páginas, como hace agendamiento al reservar.
export async function obtenerTutores(idMateria: string, signal: AbortSignal): Promise<TutorBusqueda[]> {
  const tutores: TutorBusqueda[] = []
  for (let page = 1; page <= PAGINAS_MAXIMAS; page++) {
    const resultado = await buscarTutores({ materiaId: idMateria, page, limit: TUTORES_POR_PAGINA, signal })
    tutores.push(...resultado.items)
    if (page >= resultado.totalPages) break
  }
  return tutores
}
