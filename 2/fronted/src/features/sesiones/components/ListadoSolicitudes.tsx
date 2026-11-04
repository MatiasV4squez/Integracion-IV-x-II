import type { ReactNode } from 'react'
import type { Materia } from '../../materias/models/materia'
import type { Sesion } from '../models/sesion'
import { formatearHorarioSesion, obtenerPlazoSolicitud } from '../utils/solicitudes-recibidas'

interface ListadoSolicitudesProps {
  solicitudes: Sesion[]
  materias: Materia[]
  ahora: number
  renderizarAcciones?: (solicitud: Sesion) => ReactNode
}

export function ListadoSolicitudes({ solicitudes, materias, ahora, renderizarAcciones }: ListadoSolicitudesProps) {
  const porId = new Map(materias.map((materia) => [materia.idMateria, materia]))
  return (
    <table className="listado-solicitudes">
      <caption className="solicitudes-recibidas__solo-lectores">Solicitudes pendientes recibidas. Horarios de Chile continental.</caption>
      <thead><tr>
        <th scope="col">Estudiante / Materia</th>
        <th scope="col">Fecha y horario</th>
        <th scope="col">Estado / Plazo</th>
        {renderizarAcciones && <th scope="col">Acciones</th>}
      </tr></thead>
      <tbody>
        {solicitudes.map((solicitud) => {
          const materia = porId.get(solicitud.id_materia)
          return (
            <tr key={solicitud.id_sesion}>
              <td data-etiqueta="Estudiante / Materia">
                <strong>Estudiante #{solicitud.id_tutee}</strong>
                <p>{materia ? materia.nombre + ' · ' + materia.codigo : 'Materia #' + solicitud.id_materia}</p>
              </td>
              <td data-etiqueta="Fecha y horario">
                <time dateTime={solicitud.inicio}>{formatearHorarioSesion(solicitud.inicio, solicitud.fin)}</time>
              </td>
              <td data-etiqueta="Estado / Plazo">
                <span className="listado-solicitudes__pendiente">Pendiente</span>
                <p>{obtenerPlazoSolicitud(solicitud.fecha_creacion, ahora)}</p>
              </td>
              {renderizarAcciones && <td data-etiqueta="Acciones">{renderizarAcciones(solicitud)}</td>}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
