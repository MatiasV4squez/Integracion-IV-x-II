import type { AvailabilityBlock, DayId } from '../types/availability'

export interface DayInfo {
  id: DayId
  label: string
  short: string
}

export const DAYS: readonly DayInfo[] = [
  { id: 'mon', label: 'Lunes', short: 'Lun' },
  { id: 'tue', label: 'Martes', short: 'Mar' },
  { id: 'wed', label: 'Miércoles', short: 'Mié' },
  { id: 'thu', label: 'Jueves', short: 'Jue' },
  { id: 'fri', label: 'Viernes', short: 'Vie' },
  { id: 'sat', label: 'Sábado', short: 'Sáb' },
  { id: 'sun', label: 'Domingo', short: 'Dom' },
]

export function getDayInfo(day: DayId): DayInfo {
  return DAYS.find((item) => item.id === day) ?? DAYS[0]
}

/**
 * Datos de demostración. Se usan la primera vez que se abre la pantalla;
 * a partir de ahí los cambios se conservan en el navegador.
 */
export const SEED_BLOCKS: AvailabilityBlock[] = [
  {
    id: 'demo-mon-1',
    day: 'mon',
    start: '09:00',
    end: '11:00',
    modality: 'virtual',
    location: 'https://meet.google.com/tutoria-matematicas',
    notes: 'Resolver dudas de la unidad 2.',
  },
  {
    id: 'demo-mon-2',
    day: 'mon',
    start: '15:00',
    end: '17:00',
    modality: 'presencial',
    location: 'Aula 204 · Bloque B',
    notes: '',
  },
  {
    id: 'demo-wed-1',
    day: 'wed',
    start: '10:00',
    end: '12:00',
    modality: 'virtual',
    location: 'https://meet.google.com/tutoria-matematicas',
    notes: '',
  },
  {
    id: 'demo-fri-1',
    day: 'fri',
    start: '08:30',
    end: '10:00',
    modality: 'presencial',
    location: 'Aula 204 · Bloque B',
    notes: 'Traer los ejercicios resueltos.',
  },
]
