import { Link } from 'react-router'
import type { Materia } from '../../materias/models/materia'
import type { ConsultaPerfilTutor } from '../models/consulta-perfil-tutor'
import { formatearHorario } from '../utils/formatear-horario'
import './PerfilTutorPage.css'

interface PerfilTutorPageProps {
  consulta: ConsultaPerfilTutor
  materia?: Materia
  destinoVolver: string
  destinoSolicitud?: string
  onReintentar: () => void
}

const formatoPromedio = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export default function PerfilTutorPage({ consulta, materia, destinoVolver, destinoSolicitud, onReintentar }: PerfilTutorPageProps) {
  return (
    <main className="perfil-tutor" aria-labelledby="perfil-tutor-titulo">
      <Link className="perfil-tutor__volver" to={destinoVolver}>Volver a la búsqueda</Link>
      {consulta.estado === 'listo' ? (
        <PerfilListo consulta={consulta} materia={materia} destinoSolicitud={destinoSolicitud} />
      ) : (
        <section className="perfil-tutor__tarjeta perfil-tutor__estado" role={consulta.estado === 'error' ? 'alert' : 'status'}>
          <h1 id="perfil-tutor-titulo">
            {consulta.estado === 'cargando' ? 'Cargando perfil…'
              : consulta.estado === 'error' ? 'No pudimos cargar el perfil'
                : consulta.estado === 'no-encontrado' ? 'Tutor no disponible'
                  : 'Selecciona un tutor desde la búsqueda'}
          </h1>
          <p>
            {consulta.estado === 'cargando' ? 'Estamos consultando la información del tutor.'
              : consulta.estado === 'error' ? consulta.mensaje
                : consulta.estado === 'no-encontrado' ? 'Este tutor no está habilitado para la materia seleccionada.'
                  : 'Busca tutores por materia y abre el perfil desde los resultados.'}
          </p>
          {consulta.estado === 'error' && (
            <button type="button" className="perfil-tutor__boton" onClick={onReintentar}>Reintentar</button>
          )}
        </section>
      )}
    </main>
  )
}

function PerfilListo({ consulta: { tutor }, materia, destinoSolicitud }: {
  consulta: Extract<ConsultaPerfilTutor, { estado: 'listo' }>
  materia?: Materia
  destinoSolicitud?: string
}) {
  const nombre = tutor.nombre?.trim() || 'Tutor'
  const horarios = [...tutor.horariosDisponibles].sort((a, b) =>
    (a.dia + a.horaInicio).localeCompare(b.dia + b.horaInicio),
  )

  return (
    <section className="perfil-tutor__tarjeta">
      <div className="perfil-tutor__cabecera">
        <div className="perfil-tutor__avatar" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
          </svg>
        </div>
        <div className="perfil-tutor__datos">
          <h1 id="perfil-tutor-titulo">{nombre}</h1>
          {materia && <p className="perfil-tutor__materia">Tutor de {materia.nombre} · {materia.codigo}</p>}
          <p className="perfil-tutor__calificacion">
            {tutor.promedioCalificaciones === null ? 'Sin calificaciones' : (
              <>
                {formatoPromedio.format(tutor.promedioCalificaciones)} de 5
                {' · '}{tutor.cantidadCalificaciones}{' '}
                {tutor.cantidadCalificaciones === 1 ? 'calificación' : 'calificaciones'}
              </>
            )}
          </p>
        </div>
      </div>

      <h2>Horarios disponibles</h2>
      {horarios.length > 0 ? (
        <ul className="perfil-tutor__horarios">
          {horarios.map((horario) => <li key={horario.idBloque}>{formatearHorario(horario)}</li>)}
        </ul>
      ) : (
        <p className="perfil-tutor__sin-horarios">Este tutor no tiene horarios disponibles por ahora.</p>
      )}

      {destinoSolicitud && horarios.length > 0 && (
        <Link className="perfil-tutor__boton" to={destinoSolicitud} aria-label={'Solicitar tutoría con ' + nombre}>
          Solicitar tutoría
        </Link>
      )}
    </section>
  )
}
