import type { HorarioDisponible } from '../models/tutor-busqueda'

const formatoFecha = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatearHorario(horario: HorarioDisponible): string {
  // El día representa una fecha de calendario, sin convertirla a otra zona horaria.
  const fecha = new Date(horario.dia + 'T00:00:00Z')
  const dia = Number.isNaN(fecha.getTime()) ? horario.dia : formatoFecha.format(fecha)
  return dia + ' · ' + horario.horaInicio.slice(0, 5) + '–' + horario.horaFin.slice(0, 5)
}
