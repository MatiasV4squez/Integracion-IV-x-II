import { Link } from 'react-router'
import type { Materia } from '../../materias/models/materia'
import type { CancelacionSesiones } from '../hooks/useCancelarSesion'
import type { Sesion } from '../models/sesion'
import { etiquetarEstadoActivo } from '../utils/sesiones-activas'
import { AccionCancelarSesion } from './CancelacionSesion'
import { formatearHorarioSesion } from '../utils/solicitudes-recibidas'

interface ListadoSesionesActivasProps {
  sesiones: Sesion[]
  materias: Materia[]
  cancelacion?: CancelacionSesiones
  nombresTutores?: Map<string, string>
}

export function ListadoSesionesActivas({ sesiones, materias, cancelacion, nombresTutores }: ListadoSesionesActivasProps) {
  const porId = new Map(materias.map((materia) => [materia.idMateria, materia]))
  return (
    <table className="listado-sesiones-activas">
      <caption className="sesiones-activas__solo-lectores">Sesiones activas del estudiante. Horarios de Chile continental.</caption>
      <thead><tr>
        <th scope="col">Materia / Tutor</th>
        <th scope="col">Fecha y horario</th>
        <th scope="col">Estado</th>
        <th scope="col">Acciones</th>
      </tr></thead>
      <tbody>
        {sesiones.map((sesion) => {
          const materia = porId.get(sesion.id_materia)
          return (
            <tr key={sesion.id_sesion}>
              <td data-etiqueta="Materia / Tutor">
                <strong>{materia ? materia.nombre + ' · ' + materia.codigo : 'Materia #' + sesion.id_materia}</strong>
                <p>{nombresTutores?.get(sesion.id_tutor) ?? 'Tutor #' + sesion.id_tutor}</p>
                <Link className="listado-sesiones-activas__detalle" to={'/panel/tutorias/' + sesion.id_sesion + '?vista=activas'}
                  aria-label={'Ver detalle de la tutoría #' + sesion.id_sesion}>Ver detalle</Link>
              </td>
              <td data-etiqueta="Fecha y horario">
                <time dateTime={sesion.inicio}>{formatearHorarioSesion(sesion.inicio, sesion.fin)}</time>
              </td>
              <td data-etiqueta="Estado">
                <span className="listado-sesiones-activas__etiqueta">{etiquetarEstadoActivo(sesion.estado_sesion)}</span>
              </td>
              <td data-etiqueta="Acciones">
                <div className="listado-sesiones-activas__acciones">
                  <AccionCancelarSesion sesion={sesion} cancelacion={cancelacion} />
                  {[
                    'CONFIRMADA',
                    'PENDIENTE_CIERRE',
                    'COMPLETADA',
                    'NO_REALIZADA',
                    'INASISTENCIA',
                    'EN_CONFLICTO',
                  ].includes(sesion.estado_sesion) && (
                    <Link
                      className="sesiones-activas__boton sesiones-activas__boton--secundario"
                      to={`/reportes/nuevo?sesionId=${sesion.id_sesion}&usuarioReportadoId=${sesion.id_tutor}`}
                    >
                      Reportar problema
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
