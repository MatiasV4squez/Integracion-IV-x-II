import { useCallback, useEffect, useState } from 'react'
import { SEED_BLOCKS } from '../data/availability'
import { createBlockId, sortBlocks } from '../lib/availability'
import { DAY_IDS, type AvailabilityBlock, type BlockDraft, type DayId } from '../types/availability'

const STORAGE_KEY = 'tutor-availability:v1'

function isDayId(value: unknown): value is DayId {
  return typeof value === 'string' && DAY_IDS.includes(value as DayId)
}

function isAvailabilityBlock(value: unknown): value is AvailabilityBlock {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const block = value as Record<string, unknown>

  return (
    typeof block.id === 'string' &&
    isDayId(block.day) &&
    typeof block.start === 'string' &&
    typeof block.end === 'string' &&
    (block.modality === 'virtual' || block.modality === 'presencial') &&
    typeof block.location === 'string' &&
    typeof block.notes === 'string'
  )
}

function loadBlocks(): AvailabilityBlock[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return sortBlocks(SEED_BLOCKS)
    }

    const parsed: unknown = JSON.parse(raw)

    if (Array.isArray(parsed) && parsed.every(isAvailabilityBlock)) {
      return sortBlocks(parsed)
    }
  } catch {
    // Si el almacenamiento no está disponible, se usan los datos de ejemplo.
  }

  return sortBlocks(SEED_BLOCKS)
}

export function useAvailability() {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(loadBlocks)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks))
    } catch {
      // El estado sigue funcionando en memoria aunque no se pueda persistir.
    }
  }, [blocks])

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timer = window.setTimeout(() => setFeedback(null), 3600)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const addBlock = useCallback((draft: BlockDraft) => {
    const block: AvailabilityBlock = { ...draft, id: createBlockId() }
    setBlocks((current) => sortBlocks([...current, block]))
    setFeedback('Bloque agregado a tu disponibilidad.')
  }, [])

  const updateBlock = useCallback((id: string, draft: BlockDraft) => {
    setBlocks((current) =>
      sortBlocks(current.map((block) => (block.id === id ? { ...draft, id } : block))),
    )
    setEditingId(null)
    setFeedback('Cambios guardados correctamente.')
  }, [])

  const removeBlock = useCallback((id: string) => {
    setBlocks((current) => current.filter((block) => block.id !== id))
    setEditingId((current) => (current === id ? null : current))
    setFeedback('Bloque eliminado.')
  }, [])

  return {
    blocks,
    editingId,
    feedback,
    setEditingId,
    setFeedback,
    addBlock,
    updateBlock,
    removeBlock,
  }
}
