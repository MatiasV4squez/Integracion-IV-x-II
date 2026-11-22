// Mismos límites que valida usuarios-auth en PATCH /usuarios/perfil.
export const LIMITES_PERFIL = {
  nombre: 150,
  carrera: 150,
  biografia: 1000,
  semestreMinimo: 1,
  semestreMaximo: 14,
  asignaturasInteres: 10,
} as const

export interface PerfilUsuario {
  id: string
  nombre: string
  correo_institucional: string
  carrera: string | null
  semestre_actual: number | null
  biografia: string | null
  asignaturas_interes: string[]
}

// Solo viajan los campos modificados; null borra un dato opcional.
export type CambiosPerfil = Partial<Omit<PerfilUsuario, 'id' | 'correo_institucional'>>

export type ConsultaPerfil =
  | { estado: 'cargando' }
  | { estado: 'listo'; perfil: PerfilUsuario }
  | { estado: 'error'; mensaje: string; tipo: TipoErrorPerfil }

export type TipoErrorPerfil = 'sesion' | 'no-encontrado' | 'invalido' | 'consulta'

export type EstadoGuardadoPerfil =
  | { estado: 'inactivo' }
  | { estado: 'guardando' }
  | { estado: 'exitoso' }
  | { estado: 'error'; mensaje: string; sesionInvalida: boolean }
