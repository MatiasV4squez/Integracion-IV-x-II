import { useState } from 'react'
import { Icon } from '../../../components/Icon'
import type { BloqueDisponibilidad } from '../models/bloque-disponibilidad'

interface Propiedades {
  bloques: BloqueDisponibilidad[]
  idEdicion: string | null
  guardando: boolean
  onEditar: (bloque: BloqueDisponibilidad) => void
  onEliminar: (idBloque: string) => Promise<boolean>
}

function formatearFecha(dia: string) {
  return new Date(`${dia}T00:00:00.000Z`).toLocaleDateString(
    'es-CL',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    },
  )
}

export function ListadoBloques({
  bloques,
  idEdicion,
  guardando,
  onEditar,
  onEliminar,
}: Propiedades) {
  const [confirmando, establecerConfirmando] =
    useState<string | null>(null)

  const visibles = bloques.filter(
    (bloque) => bloque.estadoBloque !== 'INACTIVO',
  )

  const fechas = [...new Set(visibles.map((bloque) => bloque.dia))]
    .sort()

  if (visibles.length === 0) {
    return (
      <div className="empty-state">
        <Icon name="calendar" size={30} />
        <h3>Aún no tienes bloques de disponibilidad</h3>
        <p>Usa el formulario para añadir tu primer horario.</p>
      </div>
    )
  }

  return (
    <div className="schedule-list">
      {fechas.map((fecha) => {
        const bloquesDelDia = visibles
          .filter((bloque) => bloque.dia === fecha)
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))

        return (
          <section className="day-group" key={fecha}>
            <header className="day-heading">
              <h3>
                <time dateTime={fecha}>
                  {formatearFecha(fecha)}
                </time>
              </h3>
              <span>
                {bloquesDelDia.length}{' '}
                {bloquesDelDia.length === 1 ? 'bloque' : 'bloques'}
              </span>
            </header>

            <div className="day-blocks">
              {bloquesDelDia.map((bloque) => {
                const modificable =
                  bloque.estadoBloque === 'DISPONIBLE' &&
                  !guardando

                return (
                  <article
                    key={bloque.idBloque}
                    className={`time-block ${
                      idEdicion === bloque.idBloque
                        ? 'is-editing'
                        : ''
                    }`}
                  >
                    <div className="time-block__body">
                      <div className="time-block__time">
                        <span>{bloque.horaInicio}</span>
                        <Icon name="arrow-right" />
                        <span>{bloque.horaFin}</span>
                      </div>

                      <span className="tag">
                        {bloque.estadoBloque === 'RESERVADO'
                          ? 'Reservado'
                          : 'Disponible'}
                      </span>
                    </div>

                    <div className="time-block__side">
                      {confirmando === bloque.idBloque ? (
                        <div
                          className="inline-confirm"
                          role="group"
                          aria-label="Confirmar eliminación"
                        >
                          <span>¿Eliminar?</span>

                          <button
                            className="mini-button mini-button--danger"
                            type="button"
                            disabled={!modificable}
                            onClick={async () => {
                              const eliminado = await onEliminar(
                                bloque.idBloque,
                              )

                              if (eliminado) {
                                establecerConfirmando(null)
                              }
                            }}
                          >
                            Sí
                          </button>

                          <button
                            className="mini-button"
                            type="button"
                            disabled={guardando}
                            onClick={() => establecerConfirmando(null)}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="block-actions">
                          <button
                            className="text-button"
                            type="button"
                            disabled={!modificable}
                            onClick={() => onEditar(bloque)}
                            aria-label={`Editar bloque del ${fecha}, ${bloque.horaInicio} a ${bloque.horaFin}`}
                          >
                            <Icon name="pencil" />
                            Editar
                          </button>

                          <button
                            className="text-button text-button--danger"
                            type="button"
                            disabled={!modificable}
                            onClick={() =>
                              establecerConfirmando(bloque.idBloque)
                            }
                            aria-label={`Eliminar bloque del ${fecha}, ${bloque.horaInicio} a ${bloque.horaFin}`}
                          >
                            <Icon name="trash" />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}