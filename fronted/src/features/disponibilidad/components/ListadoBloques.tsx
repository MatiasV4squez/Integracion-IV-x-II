import { useState } from 'react'
import type { BloqueDisponibilidad } from '../models/bloque-disponibilidad'
import './ListadoBloques.css'

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
      <div className="listado-bloques__vacio">
        <h3>Aún no tienes bloques de disponibilidad</h3>
        <p>Usa el formulario para añadir tu primer horario.</p>
      </div>
    )
  }

  return (
    <div className="listado-bloques">
      {fechas.map((fecha) => {
        const bloquesDelDia = visibles
          .filter((bloque) => bloque.dia === fecha)
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))

        return (
          <section className="listado-bloques__dia" key={fecha}>
            <div className="listado-bloques__cabecera">
              <h3>
                <time dateTime={fecha}>
                  {formatearFecha(fecha)}
                </time>
              </h3>
              <span>
                {bloquesDelDia.length}{' '}
                {bloquesDelDia.length === 1 ? 'bloque' : 'bloques'}
              </span>
            </div>

            <div className="listado-bloques__bloques">
              {bloquesDelDia.map((bloque) => {
                const modificable =
                  bloque.estadoBloque === 'DISPONIBLE' &&
                  !guardando
                const reservado = bloque.estadoBloque === 'RESERVADO'

                return (
                  <article
                    key={bloque.idBloque}
                    className={`bloque-horario${
                      idEdicion === bloque.idBloque
                        ? ' is-editing'
                        : ''
                    }`}
                  >
                    <div className="bloque-horario__datos">
                      <strong className="bloque-horario__hora">
                        <span>{bloque.horaInicio}</span> a{' '}
                        <span>{bloque.horaFin}</span>
                      </strong>

                      <span
                        className={
                          reservado
                            ? 'bloque-horario__estado bloque-horario__estado--reservado'
                            : 'bloque-horario__estado bloque-horario__estado--disponible'
                        }
                      >
                        {reservado ? 'Reservado' : 'Disponible'}
                      </span>
                    </div>

                    <div className="bloque-horario__acciones">
                      {confirmando === bloque.idBloque ? (
                        <div
                          className="bloque-horario__confirmacion"
                          role="group"
                          aria-label="Confirmar eliminación"
                        >
                          <span>¿Eliminar?</span>

                          <button
                            className="bloque-horario__mini-boton bloque-horario__mini-boton--peligro"
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
                            className="bloque-horario__mini-boton"
                            type="button"
                            disabled={guardando}
                            onClick={() => establecerConfirmando(null)}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            className="bloque-horario__accion"
                            type="button"
                            disabled={!modificable}
                            onClick={() => onEditar(bloque)}
                            aria-label={`Editar bloque del ${fecha}, ${bloque.horaInicio} a ${bloque.horaFin}`}
                          >
                            Editar
                          </button>

                          <button
                            className="bloque-horario__accion bloque-horario__accion--peligro"
                            type="button"
                            disabled={!modificable}
                            onClick={() =>
                              establecerConfirmando(bloque.idBloque)
                            }
                            aria-label={`Eliminar bloque del ${fecha}, ${bloque.horaInicio} a ${bloque.horaFin}`}
                          >
                            Eliminar
                          </button>
                        </>
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
