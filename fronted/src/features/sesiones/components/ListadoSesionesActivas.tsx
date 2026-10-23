import type { Materia } from '../../materias/models/materia'
import type { Sesion } from '../models/sesion'
import { etiquetarEstadoActivo } from '../utils/sesiones-activas'
import { formatearHorarioSesion } from '../utils/solicitudes-recibidas'

interface ListadoSesionesActivasProps {
  sesiones: Sesion[]
  materias: Materia[]
}

export function ListadoSesionesActivas({ sesiones, materias }: ListadoSesionesActivasProps) {
  const porId = new Map(materias.map((materia) => [materia.idMateria, materia]))
  return (
    <table className="listado-sesiones-activas">
      <caption className="sesiones-activas__solo-lectores">Sesiones activas del estudiante. Horarios de Chile continental.</caption>
      <thead><tr>
        <th scope="col">Materia / Tutor</th>
        <th scope="col">Fecha y horario</th>
        <th scope="col">Estado</th>
      </tr></thead>
      <tbody>
        {sesiones.map((sesion) => {
          const materia = porId.get(sesion.id_materia)
          return (
            <tr key={sesion.id_sesion}>
              <td data-etiqueta="Materia / Tutor">
                <strong>{materia ? materia.nombre + ' · ' + materia.codigo : 'Materia #' + sesion.id_materia}</strong>
                <p>Tutor #{sesion.id_tutor}</p>
              </td>
              <td data-etiqueta="Fecha y horario">
                <time dateTime={sesion.inicio}>{formatearHorarioSesion(sesion.inicio, sesion.fin)}</time>
              </td>
              <td data-etiqueta="Estado">
                <span className="listado-sesiones-activas__etiqueta">{etiquetarEstadoActivo(sesion.estado_sesion)}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
