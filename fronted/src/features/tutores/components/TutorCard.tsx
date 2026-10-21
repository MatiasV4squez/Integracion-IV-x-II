import type { TutorBusqueda } from '../models/tutor-busqueda'
import { formatearHorario } from '../utils/formatear-horario'
import './TutorCard.css'

interface TutorCardProps {
  tutor: TutorBusqueda
  onVerPerfil?: (idTutor: string) => void
}

const formatoPromedio = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function TutorCard({ tutor, onVerPerfil }: TutorCardProps) {
  const nombre = tutor.nombre?.trim() || 'Tutor'
  const proximoHorario = [...tutor.horariosDisponibles].sort((a, b) =>
    (a.dia + a.horaInicio).localeCompare(b.dia + b.horaInicio),
  )[0]

  return (
    <article className="tutor-card">
      <div className="tutor-card__avatar" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </svg>
      </div>
      <div className="tutor-card__informacion">
        <h3>{nombre}</h3>
        <p className="tutor-card__calificacion">
          {tutor.promedioCalificaciones === null ? (
            'Sin calificaciones'
          ) : (
            <>
              <span aria-hidden="true">★ </span>
              <span className="tutor-card__solo-lectores">Calificación: </span>
              {formatoPromedio.format(tutor.promedioCalificaciones)} de 5
              {' · '}{tutor.cantidadCalificaciones}{' '}
              {tutor.cantidadCalificaciones === 1 ? 'calificación' : 'calificaciones'}
            </>
          )}
        </p>
        <p className="tutor-card__horario">
          {proximoHorario
            ? 'Próximo horario: ' + formatearHorario(proximoHorario)
            : 'Sin horarios disponibles'}
        </p>
      </div>
      <button
        className="tutor-card__perfil"
        type="button"
        disabled={!onVerPerfil}
        onClick={() => onVerPerfil?.(tutor.idTutor)}
        title={!onVerPerfil ? 'El perfil aún no está disponible.' : undefined}
        aria-label={'Ver perfil de ' + nombre}
      >
        Ver perfil
      </button>
    </article>
  )
}
