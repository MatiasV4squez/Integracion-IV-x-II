import type { BloqueDisponibilidad, HorarioDisponibilidad } from '../models/bloque-disponibilidad'

export interface ErroresHorario {
  dia?: string
  horaInicio?: string
  horaFin?: string
  formulario?: string
}

export function validarHorario(horario: HorarioDisponibilidad, bloques: BloqueDisponibilidad[], idEdicion: string | null): ErroresHorario {
  const errores: ErroresHorario = {}

  const fecha = new Date(`${horario.dia}T00:00:00.000Z`)

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(horario.dia) ||
    !Number.isFinite(fecha.getTime()) ||
    fecha.toISOString().slice(0, 10) !== horario.dia
  ) {
    errores.dia = 'Selecciona una fecha válida.'
  }

  const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/

  if (!formatoHora.test(horario.horaInicio)) {
    errores.horaInicio = 'Indica una hora de inicio válida.'
  }

  if (!formatoHora.test(horario.horaFin)) {
    errores.horaFin = 'Indica una hora de fin válida.'
  }

  if (Object.keys(errores).length > 0) {
    return errores
  }

  if (horario.horaInicio >= horario.horaFin) {
    errores.horaFin =
      'La hora de fin debe ser posterior a la de inicio.'

    return errores
  }

  const haySolapamiento = bloques.some(
    (bloque) =>
      bloque.idBloque !== idEdicion &&
      bloque.estadoBloque !== 'INACTIVO' &&
      bloque.dia === horario.dia &&
      horario.horaInicio < bloque.horaFin &&
      horario.horaFin > bloque.horaInicio,
  )

  if (haySolapamiento) {
    errores.formulario =
      'Ese horario se solapa con otro de tus bloques.'
  }

  return errores
}