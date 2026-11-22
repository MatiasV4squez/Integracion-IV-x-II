import { validarLongitudMaxima, validarObligatorio } from '../../../shared/utils/validaciones-formulario'
import { LIMITES_PERFIL, type CambiosPerfil, type PerfilUsuario } from '../models/perfil'

// El semestre se edita como texto para distinguir un campo vacío de un número inválido.
export interface FormularioPerfil {
  nombre: string
  carrera: string
  semestre: string
  biografia: string
  asignaturas: string[]
}

export type CampoPerfil = keyof FormularioPerfil
export type ErroresPerfil = Partial<Record<CampoPerfil, string>>
export const CAMPOS_PERFIL: CampoPerfil[] = ['nombre', 'carrera', 'semestre', 'biografia', 'asignaturas']

export function desdePerfil(perfil: PerfilUsuario): FormularioPerfil {
  return {
    nombre: perfil.nombre,
    carrera: perfil.carrera ?? '',
    semestre: perfil.semestre_actual === null ? '' : String(perfil.semestre_actual),
    biografia: perfil.biografia ?? '',
    asignaturas: [...perfil.asignaturas_interes],
  }
}

export function validarFormularioPerfil(formulario: FormularioPerfil): ErroresPerfil {
  const errores: ErroresPerfil = {}
  const nombre = formulario.nombre.trim()
  const semestre = formulario.semestre.trim()
  errores.nombre = validarObligatorio(nombre, 'El nombre') ?? validarLongitudMaxima(nombre, LIMITES_PERFIL.nombre, 'El nombre')
  errores.carrera = validarLongitudMaxima(formulario.carrera.trim(), LIMITES_PERFIL.carrera, 'La carrera')
  if (semestre && (!/^\d+$/.test(semestre) || Number(semestre) < LIMITES_PERFIL.semestreMinimo || Number(semestre) > LIMITES_PERFIL.semestreMaximo)) {
    errores.semestre = `Indica un semestre entre ${LIMITES_PERFIL.semestreMinimo} y ${LIMITES_PERFIL.semestreMaximo}.`
  }
  errores.biografia = validarLongitudMaxima(formulario.biografia.trim(), LIMITES_PERFIL.biografia, 'La biografía')
  if (formulario.asignaturas.length > LIMITES_PERFIL.asignaturasInteres) {
    errores.asignaturas = `Elige como máximo ${LIMITES_PERFIL.asignaturasInteres} asignaturas.`
  }
  return Object.fromEntries(Object.entries(errores).filter(([, error]) => error)) as ErroresPerfil
}

const textoOpcional = (valor: string) => valor.trim() || null

// Compara con el perfil guardado y devuelve solo lo que cambió, ya normalizado como lo espera la API.
export function calcularCambiosPerfil(perfil: PerfilUsuario, formulario: FormularioPerfil): CambiosPerfil {
  const cambios: CambiosPerfil = {}
  const nombre = formulario.nombre.trim()
  const carrera = textoOpcional(formulario.carrera)
  const semestre = formulario.semestre.trim() ? Number(formulario.semestre.trim()) : null
  const biografia = textoOpcional(formulario.biografia)
  const asignaturas = [...new Set(formulario.asignaturas)]
  if (nombre !== perfil.nombre) cambios.nombre = nombre
  if (carrera !== perfil.carrera) cambios.carrera = carrera
  if (semestre !== perfil.semestre_actual) cambios.semestre_actual = semestre
  if (biografia !== perfil.biografia) cambios.biografia = biografia
  if (asignaturas.join() !== perfil.asignaturas_interes.join()) cambios.asignaturas_interes = asignaturas
  return cambios
}
