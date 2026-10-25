import { useEffect, useRef, useState } from 'react'
import type { SeleccionTutoria } from '../../sesiones/models/solicitud-tutoria'
import type { TutorBusqueda } from '../models/tutor-busqueda'

interface Propiedades {
  idMateria: string
  tutores: TutorBusqueda[]
  alSeleccionar: (seleccion: SeleccionTutoria | null) => void
}

const formatoFecha = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
})

export function SelectorTutorBloque({ idMateria, tutores, alSeleccionar }: Propiedades) {
  const [estado, establecerEstado] = useState({ idMateria, idTutor: '', dia: '', idBloque: '' })
  const ultimaSeleccionNotificada = useRef('')
  const { idTutor, dia, idBloque } = estado

  const tutorSeleccionado = tutores.find((tutor) => tutor.idTutor === idTutor)
  const fechas = [...new Set(tutorSeleccionado?.horariosDisponibles.map((bloque) => bloque.dia))].sort()
  const horarios = tutorSeleccionado?.horariosDisponibles
    .filter((bloque) => bloque.dia === dia)
    .toSorted((primero, segundo) => primero.horaInicio.localeCompare(segundo.horaInicio)) ?? []
  const fechaDisponible = fechas.includes(dia)
  const bloqueDisponible = horarios.some((bloque) => bloque.idBloque === idBloque)

  // Ajusta el estado antes de mostrar datos que dejaron de estar disponibles.
  if (estado.idMateria !== idMateria || (idTutor !== '' && !tutorSeleccionado)) {
    establecerEstado({ idMateria, idTutor: '', dia: '', idBloque: '' })
  } else if (dia !== '' && !fechaDisponible) {
    establecerEstado({ ...estado, dia: '', idBloque: '' })
  } else if (idBloque !== '' && !bloqueDisponible) {
    establecerEstado({ ...estado, idBloque: '' })
  }

  const seleccionCompleta = estado.idMateria === idMateria && bloqueDisponible

  // Comunica cada cambio de IDs una sola vez, incluso si cambia el callback del padre.
  useEffect(() => {
    const firma = seleccionCompleta ? JSON.stringify([idMateria, idTutor, idBloque]) : ''
    if (firma === ultimaSeleccionNotificada.current) return
    ultimaSeleccionNotificada.current = firma
    alSeleccionar(seleccionCompleta ? {
      id_materia: idMateria,
      id_tutor: idTutor,
      id_bloque: idBloque,
    } : null)
  }, [idMateria, idTutor, idBloque, seleccionCompleta, alSeleccionar])

  function cambiarTutor(nuevoIdTutor: string) {
    establecerEstado({ idMateria, idTutor: nuevoIdTutor, dia: '', idBloque: '' })
  }

  function cambiarDia(nuevoDia: string) {
    if (nuevoDia === dia) return
    establecerEstado({ ...estado, dia: nuevoDia, idBloque: '' })
  }

  function cambiarBloque(nuevoIdBloque: string) {
    const bloque = horarios.find((horario) => horario.idBloque === nuevoIdBloque)
    if (!tutorSeleccionado || !bloque) return
    establecerEstado({ ...estado, idBloque: bloque.idBloque })
  }

  return (
    <section className="selector-tutoria">
      <label htmlFor="selector-tutor">Tutor</label>
      <select
        id="selector-tutor"
        value={idTutor}
        onChange={(evento) => cambiarTutor(evento.target.value)}
        disabled={tutores.length === 0}
      >
        <option value="">Selecciona un tutor</option>
        {tutores.map((tutor) => (
          <option key={tutor.idTutor} value={tutor.idTutor}>
            Tutor {tutor.idTutor}
          </option>
        ))}
      </select>

      {tutores.length === 0 ? (
        <p>No hay tutores disponibles para esta materia.</p>
      ) : !tutorSeleccionado ? (
        <p>Selecciona un tutor para consultar sus fechas y horarios.</p>
      ) : tutorSeleccionado.horariosDisponibles.length === 0 ? (
        <p>Este tutor no tiene horarios disponibles.</p>
      ) : (
        <>
          <fieldset className="selector-tutoria__grupo">
            <legend>Fechas disponibles</legend>
            <div className="selector-tutoria__opciones">
              {fechas.map((fecha) => (
                <button
                  key={fecha}
                  type="button"
                  className="selector-tutoria__boton"
                  aria-pressed={fecha === dia}
                  onClick={() => cambiarDia(fecha)}
                >
                  <time dateTime={fecha}>
                    {formatoFecha.format(new Date(`${fecha}T12:00:00Z`))}
                  </time>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="selector-tutoria__grupo" disabled={!fechaDisponible}>
            <legend>Horarios disponibles</legend>
            {fechaDisponible ? (
              <div className="selector-tutoria__opciones">
                {horarios.map((bloque) => (
                  <button
                    key={bloque.idBloque}
                    type="button"
                    className="selector-tutoria__boton"
                    aria-pressed={bloque.idBloque === idBloque}
                    onClick={() => cambiarBloque(bloque.idBloque)}
                  >
                    {bloque.horaInicio}–{bloque.horaFin}
                  </button>
                ))}
              </div>
            ) : (
              <p>Selecciona una fecha para ver sus horarios.</p>
            )}
          </fieldset>
        </>
      )}
    </section>
  )
}
