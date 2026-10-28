import { validarCorreo, validarLongitudMaxima, validarObligatorio } from '../../../shared/utils/validaciones-formulario'
import type { FormularioRegistroUsuario } from '../models/datos-registro'

export const LONGITUD_MAXIMA_NOMBRE = 120
export const LONGITUD_MINIMA_CONTRASENA = 8
export const LONGITUD_MAXIMA_CONTRASENA = 128

export type CampoRegistro = keyof FormularioRegistroUsuario
export type ErroresRegistro = Partial<Record<CampoRegistro, string>>
export const CAMPOS_REGISTRO: CampoRegistro[] = ['nombre', 'correo', 'contrasena', 'confirmacion']

export function validarNombre(valor: string): string | undefined {
  const nombre = valor.trim()
  return validarObligatorio(nombre, 'El nombre')
    ?? validarLongitudMaxima(nombre, LONGITUD_MAXIMA_NOMBRE, 'El nombre')
}

export function validarContrasena(valor: string): string | undefined {
  return validarObligatorio(valor, 'La contraseña')
    ?? (valor.length >= LONGITUD_MINIMA_CONTRASENA
      ? undefined : `La contraseña debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`)
    ?? validarLongitudMaxima(valor, LONGITUD_MAXIMA_CONTRASENA, 'La contraseña')
}

export function validarConfirmacion(valor: string, contrasena: string): string | undefined {
  return validarObligatorio(valor, 'La confirmación')
    ?? (valor === contrasena ? undefined : 'Las contraseñas no coinciden.')
}

export function validarCorreoRegistro(valor: string): string | undefined {
  return validarCorreo(valor)
}

export function validarRegistro(formulario: FormularioRegistroUsuario): ErroresRegistro {
  const errores: ErroresRegistro = {
    nombre: validarNombre(formulario.nombre),
    correo: validarCorreoRegistro(formulario.correo),
    contrasena: validarContrasena(formulario.contrasena),
    confirmacion: validarConfirmacion(formulario.confirmacion, formulario.contrasena),
  }
  const presentes: ErroresRegistro = {}
  for (const campo of CAMPOS_REGISTRO) {
    if (errores[campo]) presentes[campo] = errores[campo]
  }
  return presentes
}
