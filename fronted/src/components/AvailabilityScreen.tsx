import { useMemo } from 'react'
import { useAvailability } from '../hooks/useAvailability'
import { formatDuration, timeToMinutes } from '../lib/availability'
import type { AvailabilityBlock } from '../types/availability'
import { BlockForm } from './BlockForm'
import { Icon } from './Icon'
import { ScheduleList } from './ScheduleList'

export function AvailabilityScreen() {
  const {
    blocks,
    editingId,
    feedback,
    setEditingId,
    setFeedback,
    addBlock,
    updateBlock,
    removeBlock,
  } = useAvailability()

  const editingBlock = blocks.find((block) => block.id === editingId) ?? null

  const weeklyMinutes = useMemo(
    () =>
      blocks.reduce((total, block) => {
        const duration = timeToMinutes(block.end) - timeToMinutes(block.start)
        return total + Math.max(0, duration)
      }, 0),
    [blocks],
  )

  const activeDays = useMemo(
    () => new Set(blocks.map((block) => block.day)).size,
    [blocks],
  )

  function handleEdit(block: AvailabilityBlock) {
    setEditingId(block.id)

    if (window.matchMedia('(max-width: 960px)').matches) {
      document.getElementById('block-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function handleSubmit(draft: Parameters<typeof addBlock>[0]) {
    if (editingBlock) {
      updateBlock(editingBlock.id, draft)
    } else {
      addBlock(draft)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand-mark">
              <Icon name="calendar" size={18} />
            </span>
            <span className="brand-name">Tutoría</span>
          </div>

          <div className="topbar__right">
            <span className="topbar-badge">Panel del tutor</span>
            <div className="profile">
              <span className="avatar" aria-hidden="true">
                AM
              </span>
              <div className="profile__info">
                <strong>Ana Martínez</strong>
                <span>Tutora de Matemáticas</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="page">
        <section className="page-heading">
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Disponibilidad semanal
          </p>
          <h1>Gestión de disponibilidad</h1>
          <p className="page-subtitle">
            Define los bloques horarios en los que tus estudiantes pueden reservar una
            tutoría. Puedes añadir, editar o eliminar bloques en cualquier momento.
          </p>
        </section>

        <section className="stats" aria-label="Resumen de disponibilidad">
          <article className="stat-card">
            <span className="stat-icon stat-icon--violet">
              <Icon name="calendar" size={20} />
            </span>
            <div>
              <span className="stat-label">Bloques activos</span>
              <strong className="stat-value">{blocks.length}</strong>
            </div>
          </article>

          <article className="stat-card">
            <span className="stat-icon stat-icon--blue">
              <Icon name="clock" size={20} />
            </span>
            <div>
              <span className="stat-label">Horas por semana</span>
              <strong className="stat-value">{formatDuration(weeklyMinutes)}</strong>
            </div>
          </article>

          <article className="stat-card">
            <span className="stat-icon stat-icon--amber">
              <Icon name="check" size={20} />
            </span>
            <div>
              <span className="stat-label">Días con disponibilidad</span>
              <strong className="stat-value">
                {activeDays} <small>de 7</small>
              </strong>
            </div>
          </article>
        </section>

        <div className="layout">
          <section className="panel schedule-panel" aria-labelledby="schedule-title">
            <header className="panel-heading">
              <div>
                <h2 id="schedule-title">Tu semana</h2>
                <p>Los bloques se agrupan por día y se ordenan por hora de inicio.</p>
              </div>
              <span className="count-pill">
                {blocks.length} {blocks.length === 1 ? 'bloque' : 'bloques'}
              </span>
            </header>

            <ScheduleList
              blocks={blocks}
              editingId={editingId}
              onEdit={handleEdit}
              onRemove={removeBlock}
            />
          </section>

          <BlockForm
            key={editingBlock?.id ?? 'new'}
            blocks={blocks}
            editingBlock={editingBlock}
            onSubmit={handleSubmit}
            onCancel={() => setEditingId(null)}
          />
        </div>
      </main>

      {feedback && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          <span>{feedback}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setFeedback(null)}>
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
