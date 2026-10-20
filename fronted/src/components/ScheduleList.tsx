import { useMemo, useState } from 'react'
import { DAYS } from '../data/availability'
import { formatDuration, MODALITY_LABELS, timeToMinutes } from '../lib/availability'
import type { AvailabilityBlock, DayId } from '../types/availability'
import { Icon } from './Icon'

interface ScheduleListProps {
  blocks: AvailabilityBlock[]
  editingId: string | null
  onEdit: (block: AvailabilityBlock) => void
  onRemove: (id: string) => void
}

export function ScheduleList({ blocks, editingId, onEdit, onRemove }: ScheduleListProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const blocksByDay = useMemo(() => {
    const groups = new Map<DayId, AvailabilityBlock[]>()

    for (const day of DAYS) {
      groups.set(day.id, [])
    }

    for (const block of blocks) {
      groups.get(block.day)?.push(block)
    }

    return groups
  }, [blocks])

  if (blocks.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state__icon">
          <Icon name="calendar" size={30} />
        </span>
        <h3>Aún no tienes bloques de disponibilidad</h3>
        <p>
          Usa el formulario para añadir tu primer horario. Los estudiantes solo podrán
          reservar dentro de los bloques que definas.
        </p>
      </div>
    )
  }

  return (
    <div className="schedule-list">
      {DAYS.map((day) => {
        const dayBlocks = blocksByDay.get(day.id) ?? []
        const totalMinutes = dayBlocks.reduce(
          (total, block) => total + timeToMinutes(block.end) - timeToMinutes(block.start),
          0,
        )

        return (
          <section className={`day-group ${dayBlocks.length === 0 ? 'is-empty' : ''}`} key={day.id}>
            <header className="day-heading">
              <h3>
                <span className="day-dot" aria-hidden="true" />
                {day.label}
              </h3>
              <span>
                {dayBlocks.length > 0
                  ? `${dayBlocks.length} ${dayBlocks.length === 1 ? 'bloque' : 'bloques'} · ${formatDuration(totalMinutes)}`
                  : 'Sin bloques'}
              </span>
            </header>

            {dayBlocks.length === 0 ? (
              <p className="day-empty">No hay disponibilidad definida para este día.</p>
            ) : (
              <div className="day-blocks">
                {dayBlocks.map((block) => {
                  const duration = timeToMinutes(block.end) - timeToMinutes(block.start)
                  const isEditing = editingId === block.id
                  const isConfirming = confirmingId === block.id
                  const isVirtualLink =
                    block.modality === 'virtual' && block.location.startsWith('http')

                  return (
                    <article
                      className={`time-block time-block--${block.modality} ${isEditing ? 'is-editing' : ''}`}
                      key={block.id}
                    >
                      <div className="time-block__body">
                        <div className="time-block__time">
                          <span>{block.start}</span>
                          <Icon name="arrow-right" size={14} />
                          <span>{block.end}</span>
                        </div>

                        <div className="time-block__meta">
                          <span className={`tag tag--${block.modality}`}>
                            <Icon
                              name={block.modality === 'virtual' ? 'video' : 'building'}
                              size={14}
                            />
                            {MODALITY_LABELS[block.modality]}
                          </span>

                          {block.location && (
                            <span className="block-location" title={block.location}>
                              <Icon
                                name={block.modality === 'virtual' ? 'video' : 'map-pin'}
                                size={14}
                              />
                              {isVirtualLink ? (
                                <a href={block.location} target="_blank" rel="noreferrer">
                                  Unirse a la videollamada
                                </a>
                              ) : (
                                block.location
                              )}
                            </span>
                          )}
                        </div>

                        {block.notes && <p className="block-notes">{block.notes}</p>}
                      </div>

                      <div className="time-block__side">
                        <div className="time-block__side-top">
                          {isEditing && <span className="editing-badge">Editando</span>}
                          <span className="block-duration">{formatDuration(duration)}</span>
                        </div>

                        {isConfirming ? (
                          <div className="inline-confirm" role="group" aria-label="Confirmar eliminación">
                            <span>¿Eliminar?</span>
                            <button
                              className="mini-button mini-button--danger"
                              type="button"
                              onClick={() => {
                                onRemove(block.id)
                                setConfirmingId(null)
                              }}
                            >
                              Sí
                            </button>
                            <button
                              className="mini-button"
                              type="button"
                              onClick={() => setConfirmingId(null)}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="block-actions">
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => onEdit(block)}
                              aria-label={`Editar bloque de ${block.start} a ${block.end}`}
                            >
                              <Icon name="pencil" size={15} />
                              Editar
                            </button>
                            <button
                              className="text-button text-button--danger"
                              type="button"
                              onClick={() => setConfirmingId(block.id)}
                              aria-label={`Eliminar bloque de ${block.start} a ${block.end}`}
                            >
                              <Icon name="trash" size={15} />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
