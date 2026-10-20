import { useId, useState, type FormEvent } from 'react'
import { DAYS } from '../data/availability'
import { formatDuration, MODALITY_LABELS, timeToMinutes, validateDraft, type BlockErrors } from '../lib/availability'
import type { AvailabilityBlock, BlockDraft, Modality } from '../types/availability'
import { Icon } from './Icon'

const EMPTY_DRAFT: BlockDraft = {
  day: 'mon',
  start: '09:00',
  end: '10:00',
  modality: 'virtual',
  location: '',
  notes: '',
}

function toDraft(block: AvailabilityBlock): BlockDraft {
  return {
    day: block.day,
    start: block.start,
    end: block.end,
    modality: block.modality,
    location: block.location,
    notes: block.notes,
  }
}

interface BlockFormProps {
  blocks: AvailabilityBlock[]
  editingBlock: AvailabilityBlock | null
  onSubmit: (draft: BlockDraft) => void
  onCancel: () => void
}

export function BlockForm({ blocks, editingBlock, onSubmit, onCancel }: BlockFormProps) {
  const [draft, setDraft] = useState<BlockDraft>(() =>
    editingBlock ? toDraft(editingBlock) : EMPTY_DRAFT,
  )
  const [errors, setErrors] = useState<BlockErrors>({})
  const formId = useId()

  function update<K extends keyof BlockDraft>(key: K, value: BlockDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors({})
  }

  function setModality(modality: Modality) {
    setDraft((current) => ({
      ...current,
      modality,
      location: current.modality === modality ? current.location : '',
    }))
    setErrors({})
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validateDraft(draft, blocks, editingBlock?.id ?? null)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    onSubmit(draft)

    if (!editingBlock) {
      setDraft({
        ...EMPTY_DRAFT,
        day: draft.day,
        modality: draft.modality,
        location: draft.location,
      })
    }
  }

  const duration = timeToMinutes(draft.end) - timeToMinutes(draft.start)
  const hasValidDuration = Number.isFinite(duration) && duration > 0
  const timeError = errors.start ?? errors.end
  const locationLabel =
    draft.modality === 'virtual' ? 'Enlace de la videollamada' : 'Lugar o aula'
  const locationPlaceholder =
    draft.modality === 'virtual'
      ? 'https://meet.google.com/...'
      : 'Ej. Aula 204 · Bloque B'
  const locationHint =
    draft.modality === 'virtual'
      ? 'Se compartirá con el estudiante al confirmar la tutoría.'
      : 'Indica el aula, laboratorio o punto de encuentro.'

  return (
    <aside className="panel form-panel" id="block-form" aria-labelledby={`${formId}-title`}>
      <div className="form-heading">
        <span className="form-heading__icon">
          <Icon name={editingBlock ? 'pencil' : 'plus'} size={20} />
        </span>
        <div>
          <h2 id={`${formId}-title`}>
            {editingBlock ? 'Editar bloque' : 'Nuevo bloque'}
          </h2>
          <p>
            {editingBlock
              ? 'Ajusta el horario y guarda los cambios.'
              : 'Añade un horario en el que puedas recibir tutorías.'}
          </p>
        </div>
      </div>

      <form className="availability-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="field">
          <legend>Día de la semana</legend>
          <div className="day-picker">
            {DAYS.map((day) => (
              <label className="day-option" key={day.id} title={day.label}>
                <input
                  type="radio"
                  name="day"
                  value={day.id}
                  checked={draft.day === day.id}
                  onChange={() => update('day', day.id)}
                />
                <span>{day.short}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="time-fields">
          <label className="field">
            <span>Desde</span>
            <input
              type="time"
              value={draft.start}
              step={900}
              onChange={(event) => update('start', event.target.value)}
              aria-invalid={Boolean(errors.start)}
              aria-describedby={timeError ? `${formId}-time-error` : undefined}
              required
            />
          </label>

          <span className="time-arrow" aria-hidden="true">
            <Icon name="arrow-right" size={16} />
          </span>

          <label className="field">
            <span>Hasta</span>
            <input
              type="time"
              value={draft.end}
              step={900}
              onChange={(event) => update('end', event.target.value)}
              aria-invalid={Boolean(errors.end)}
              aria-describedby={timeError ? `${formId}-time-error` : undefined}
              required
            />
          </label>
        </div>

        {timeError && (
          <p className="field-error" id={`${formId}-time-error`} role="alert">
            {timeError}
          </p>
        )}

        <p className="duration-hint" aria-live="polite">
          <Icon name="clock" size={15} />
          {hasValidDuration ? `Duración: ${formatDuration(duration)}` : 'Selecciona un horario válido'}
        </p>

        <fieldset className="field">
          <legend>Modalidad</legend>
          <div className="segmented">
            <label>
              <input
                type="radio"
                name="modality"
                value="virtual"
                checked={draft.modality === 'virtual'}
                onChange={() => setModality('virtual')}
              />
              <span>
                <Icon name="video" size={16} />
                {MODALITY_LABELS.virtual}
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="modality"
                value="presencial"
                checked={draft.modality === 'presencial'}
                onChange={() => setModality('presencial')}
              />
              <span>
                <Icon name="building" size={16} />
                {MODALITY_LABELS.presencial}
              </span>
            </label>
          </div>
        </fieldset>

        <label className="field">
          <span>
            {locationLabel} <em>opcional</em>
          </span>
          <input
            type={draft.modality === 'virtual' ? 'url' : 'text'}
            value={draft.location}
            onChange={(event) => update('location', event.target.value)}
            placeholder={locationPlaceholder}
            maxLength={180}
          />
          <span className="field-hint">{locationHint}</span>
        </label>

        <label className="field">
          <span>
            Notas para el estudiante <em>opcional</em>
          </span>
          <textarea
            rows={2}
            value={draft.notes}
            onChange={(event) => update('notes', event.target.value)}
            placeholder="Ej. Traer los ejercicios de la unidad 2."
            maxLength={140}
          />
          <span className="char-count">{draft.notes.length}/140</span>
        </label>

        {errors.form && (
          <p className="form-alert" role="alert">
            <Icon name="alert" size={17} />
            {errors.form}
          </p>
        )}

        <button className="primary-button" type="submit">
          <Icon name={editingBlock ? 'check' : 'plus'} size={18} />
          {editingBlock ? 'Guardar cambios' : 'Añadir bloque'}
        </button>

        {editingBlock && (
          <button className="ghost-button" type="button" onClick={onCancel}>
            Cancelar edición
          </button>
        )}
      </form>

      <p className="form-footnote">
        <Icon name="check" size={14} />
        Los cambios se guardan automáticamente en este dispositivo.
      </p>
    </aside>
  )
}
