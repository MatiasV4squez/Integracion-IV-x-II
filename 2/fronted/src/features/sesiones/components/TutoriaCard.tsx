import { Link } from 'react-router'
import type { Tutoria } from '../models/tutoria'
import { formatearHorarioSesion } from '../utils/solicitudes-recibidas'
import { EstadoTutoria } from './EstadoTutoria'

interface Propiedades {
  tutoria: Tutoria
  idUsuario: string
  materia: string
  nombres: ReadonlyMap<string, string>
  busqueda: string
  mostrarParticipacion?: boolean
}

export function TutoriaCard({ tutoria, idUsuario, materia, nombres, busqueda, mostrarParticipacion = true }: Propiedades) {
  const comoTutor = tutoria.id_tutor === idUsuario
  const contraparte = comoTutor ? tutoria.id_tutee : tutoria.id_tutor
  const propia = tutoria.calificaciones.find((nota) => nota.id_evaluador === idUsuario)
  return <article className="tutorias__tarjeta">
    <div className="tutorias__tarjeta-cabecera"><EstadoTutoria estado={tutoria.estado_sesion} /><span className="tutorias__referencia">#{tutoria.id_sesion}</span></div>
    <h2>{materia}</h2>
    {mostrarParticipacion && <p className="tutorias__participacion">{comoTutor ? 'Como tutor' : 'Como estudiante'}</p>}
    <p>Con {nombres.get(contraparte) ?? (comoTutor ? 'estudiante #' : 'tutor #') + contraparte}</p>
    <p className="tutorias__horario"><time dateTime={tutoria.inicio}>{formatearHorarioSesion(tutoria.inicio, tutoria.fin)}</time></p>
    {tutoria.resultado_provisional && <p className="tutorias__nota">Resultado provisional</p>}
    {propia ? <p className="tutorias__nota"><span aria-hidden="true">★ </span>Tu calificación: {propia.puntuacion} de 5</p>
      : tutoria.estado_sesion === 'COMPLETADA' && <p className="tutorias__nota">Aún no has calificado esta sesión</p>}
    <Link className="tutorias__ver-detalle" to={'/panel/tutorias/' + tutoria.id_sesion + busqueda} aria-label={'Ver detalle de ' + materia + ', tutoría #' + tutoria.id_sesion}>
      Ver detalle <span aria-hidden="true">→</span>
    </Link>
  </article>
}
