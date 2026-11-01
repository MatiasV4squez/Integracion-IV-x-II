import type { TutorBusqueda } from './tutor-busqueda'

export type ConsultaPerfilTutor =
  | { estado: 'invalido' }
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'no-encontrado' }
  | { estado: 'listo'; tutor: TutorBusqueda }
