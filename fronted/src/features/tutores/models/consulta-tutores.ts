import type { ResultadoBusquedaTutores } from './resultado-busqueda-tutores'

export type ConsultaTutores =
  | { estado: 'inicial' }
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'listo'; resultado: ResultadoBusquedaTutores }
