export const DAY_IDS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export type DayId = (typeof DAY_IDS)[number]

export type Modality = 'virtual' | 'presencial'

export interface AvailabilityBlock {
  id: string
  day: DayId
  start: string
  end: string
  modality: Modality
  location: string
  notes: string
}

export type BlockDraft = Omit<AvailabilityBlock, 'id'>
