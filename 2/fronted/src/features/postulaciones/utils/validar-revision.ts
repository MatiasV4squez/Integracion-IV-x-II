import { sanitizarTexto, validarLongitudMaxima, validarObligatorio } from '../../../shared/utils/validaciones-formulario'
import { esNotaAcreditada } from './validar-postulacion'

export function convertirNota(texto: string): number {
  return Number(texto.trim().replace(',', '.'))
}

export function validarNotaIngresada(texto: string): string | undefined {
  return validarObligatorio(texto, 'El campo nota acreditada')
    ?? (esNotaAcreditada(convertirNota(texto))
      ? undefined
      : 'La nota acreditada debe estar entre 5,0 y 7,0, con un máximo de un decimal.')
}

export function validarMotivoIngresado(texto: string): string | undefined {
  const motivo = sanitizarTexto(texto)
  return validarObligatorio(motivo, 'El motivo de rechazo')
    ?? validarLongitudMaxima(motivo, 500, 'El motivo de rechazo')
    ?? (motivo.length >= 3 ? undefined : 'El motivo de rechazo debe tener al menos 3 caracteres.')
}
