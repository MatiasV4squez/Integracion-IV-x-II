import type { BloqueDisponibilidad } from '../../disponibilidad/models/bloque-disponibilidad'

const fechaSantiago = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Santiago' })

// Los bloques usan fecha y hora locales de Chile; se comparan como texto YYYY-MM-DD y HH:MM.
export function seleccionarProximosBloques(bloques: BloqueDisponibilidad[], ahora: number): BloqueDisponibilidad[] {
  const hoy = fechaSantiago.format(ahora)
  return bloques.filter((bloque) => bloque.estadoBloque !== 'INACTIVO' && bloque.dia >= hoy)
    .sort((a, b) => a.dia.localeCompare(b.dia) || a.horaInicio.localeCompare(b.horaInicio))
}

export function formatearDiaBloque(dia: string): string {
  return new Date(`${dia}T00:00:00.000Z`).toLocaleDateString('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}
