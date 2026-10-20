import { DAY_IDS, type AvailabilityBlock, type BlockDraft, type Modality } from '../types/availability'

export const MODALITY_LABELS: Record<Modality, string> = {
  virtual: 'Virtual',
  presencial: 'Presencial',
}

const MIN_BLOCK_MINUTES = 30
const MAX_BLOCK_MINUTES = 8 * 60

export interface BlockErrors {
  start?: string
  end?: string
  form?: string
}

export function createBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  if (
    hours === undefined ||
    minutes === undefined ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return Number.NaN
  }

  return hours * 60 + minutes
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '0 min'
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) {
    return `${rest} min`
  }

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function blocksOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  return firstStart < secondEnd && firstEnd > secondStart
}

export function sortBlocks(blocks: AvailabilityBlock[]): AvailabilityBlock[] {
  const dayOrder = new Map(DAY_IDS.map((day, index) => [day, index]))

  return [...blocks].sort((a, b) => {
    const dayDifference = (dayOrder.get(a.day) ?? 0) - (dayOrder.get(b.day) ?? 0)
    return dayDifference !== 0 ? dayDifference : a.start.localeCompare(b.start)
  })
}

export function validateDraft(
  draft: BlockDraft,
  blocks: AvailabilityBlock[],
  editingId: string | null,
): BlockErrors {
  const errors: BlockErrors = {}
  const start = timeToMinutes(draft.start)
  const end = timeToMinutes(draft.end)

  if (!draft.start || Number.isNaN(start)) {
    errors.start = 'Indica una hora de inicio válida.'
  }

  if (!draft.end || Number.isNaN(end)) {
    errors.end = 'Indica una hora de fin válida.'
  }

  if (!errors.start && !errors.end) {
    const duration = end - start

    if (duration <= 0) {
      errors.end = 'La hora de fin debe ser posterior a la de inicio.'
    } else if (duration < MIN_BLOCK_MINUTES) {
      errors.end = 'El bloque debe durar al menos 30 minutos.'
    } else if (duration > MAX_BLOCK_MINUTES) {
      errors.end = 'El bloque no puede superar las 8 horas.'
    }
  }

  if (!errors.start && !errors.end) {
    const conflict = blocks.find(
      (block) =>
        block.id !== editingId &&
        block.day === draft.day &&
        blocksOverlap(draft.start, draft.end, block.start, block.end),
    )

    if (conflict) {
      errors.form = `Se solapa con tu bloque de ${conflict.start} a ${conflict.end}. Ajusta el horario o edita ese bloque.`
    }
  }

  return errors
}
