export const LONGITUD_MAXIMA_CORREO = 254

export function validarObligatorio(valor: string, etiqueta = 'Este campo'): string | undefined {
  return valor.trim() ? undefined : `${etiqueta} es obligatorio.`
}

export function validarLongitudMaxima(valor: string, maximo: number, etiqueta = 'Este campo'): string | undefined {
  return valor.length <= maximo ? undefined : `${etiqueta} debe tener como máximo ${maximo} caracteres.`
}

// Quita caracteres de control y espacios repetidos de un texto libre antes de validarlo o enviarlo.
export function sanitizarTexto(valor: string): string {
  return valor.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim()
}

export function normalizarCorreo(valor: string): string {
  return valor.trim().toLowerCase()
}

// Comprobación básica de la interfaz; Auth conserva la validación definitiva.
export function validarCorreo(valor: string): string | undefined {
  const correo = normalizarCorreo(valor)
  return validarObligatorio(correo, 'El correo')
    ?? validarLongitudMaxima(correo, LONGITUD_MAXIMA_CORREO, 'El correo')
    ?? (/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(correo) ? undefined : 'Ingresa un correo válido.')
}
