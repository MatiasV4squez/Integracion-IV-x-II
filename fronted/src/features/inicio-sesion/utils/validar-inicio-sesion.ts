import { validarCorreo, validarLongitudMaxima, validarObligatorio } from '../../../shared/utils/validaciones-formulario'
import type { CredencialesInicioSesion } from '../models/credenciales'

export const LONGITUD_MAXIMA_CONTRASENA = 128

export type CampoInicioSesion = keyof CredencialesInicioSesion
export type ErroresInicioSesion = Partial<Record<CampoInicioSesion, string>>
export const CAMPOS_INICIO_SESION: CampoInicioSesion[] = ['correo', 'contrasena']

// Al iniciar sesión no se exige la longitud mínima: Auth responde igual ante cualquier contraseña incorrecta.
export function validarContrasenaInicioSesion(valor: string): string | undefined {
  return validarObligatorio(valor, 'La contraseña')
    ?? validarLongitudMaxima(valor, LONGITUD_MAXIMA_CONTRASENA, 'La contraseña')
}

export function validarInicioSesion(credenciales: CredencialesInicioSesion): ErroresInicioSesion {
  const errores: ErroresInicioSesion = {}
  const correo = validarCorreo(credenciales.correo)
  const contrasena = validarContrasenaInicioSesion(credenciales.contrasena)
  if (correo) errores.correo = correo
  if (contrasena) errores.contrasena = contrasena
  return errores
}
