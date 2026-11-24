import { esIdentificador } from '../../../shared/utils/identificadores'
import { ESTADOS_REPUTACION, type TutorReputacion } from '../models/tutores-revision'

export function esTutorReputacion(valor: unknown): valor is TutorReputacion {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false
  const datos = valor as Record<string, unknown>
  return esIdentificador(datos.idTutor)
    && typeof datos.cantidadCalificaciones === 'number' && Number.isInteger(datos.cantidadCalificaciones) && datos.cantidadCalificaciones >= 0
    && (datos.promedio === null || (typeof datos.promedio === 'number' && Number.isFinite(datos.promedio) && datos.promedio >= 1 && datos.promedio <= 5))
    && ESTADOS_REPUTACION.some((estado) => estado === datos.estado)
}

export function copiarTutorReputacion(datos: TutorReputacion): TutorReputacion {
  return { idTutor: datos.idTutor, cantidadCalificaciones: datos.cantidadCalificaciones, promedio: datos.promedio, estado: datos.estado }
}
