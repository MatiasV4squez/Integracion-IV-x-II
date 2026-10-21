import type { TutorBusqueda } from './tutor-busqueda'

export interface ResultadoBusquedaTutores {
  items: TutorBusqueda[]
  total: number
  page: number
  limit: number
  totalPages: number
}
