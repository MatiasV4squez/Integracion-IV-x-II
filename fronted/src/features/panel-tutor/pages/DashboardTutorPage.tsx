import { Link } from 'react-router'
import type { ConsultaDisponibilidad } from '../../disponibilidad/models/bloque-disponibilidad'
import type { Materia } from '../../materias/models/materia'
import { AccionAceptarSolicitud } from '../../sesiones/components/AccionAceptarSolicitud'
import { EstadoSolicitudes } from '../../sesiones/components/EstadoSolicitudes'
import { ListadoSolicitudes } from '../../sesiones/components/ListadoSolicitudes'
import { ResultadoAceptacionSolicitud } from '../../sesiones/components/ResultadoAceptacionSolicitud'
import type { AceptacionSolicitud } from '../../sesiones/models/bandeja-solicitudes'
import type { ConsultaSolicitudes, Sesion } from '../../sesiones/models/sesion'
import { formatearHorarioSesion } from '../../sesiones/utils/solicitudes-recibidas'
import { formatearDiaBloque, seleccionarProximosBloques } from '../utils/resumen-tutor'
import '../../sesiones/pages/SolicitudesRecibidasPage.css'
import './DashboardTutorPage.css'

const SOLICITUDES_VISIBLES = 3
const SESIONES_VISIBLES = 3
const BLOQUES_VISIBLES = 4

const ETIQUETA_BLOQUE = { DISPONIBLE: 'Disponible', RESERVADO: 'Reservado', INACTIVO: 'Inactivo' } as const

interface Propiedades {
  nombre?: string
  ahora: number
  materias: Materia[]
  solicitudes: ConsultaSolicitudes
  aceptacion: AceptacionSolicitud
  bloqueada: boolean
  actualizando: boolean
  errorActualizacion?: string
  proximas: Sesion[] | null
  completadas: number | null
  disponibilidad: ConsultaDisponibilidad
  onAceptar: (idSesion: string) => void
  onActualizar: () => void
  onRecargarDisponibilidad: () => void
}

export default function DashboardTutorPage({
  nombre, ahora, materias, solicitudes, aceptacion, bloqueada, actualizando, errorActualizacion,
  proximas, completadas, disponibilidad, onAceptar, onActualizar, onRecargarDisponibilidad,
}: Propiedades) {
  const nombreMateria = (id: string) => materias.find((materia) => materia.idMateria === id)?.nombre ?? 'Materia #' + id
  const pendientes = solicitudes.estado === 'listo' ? solicitudes.solicitudes : []
  const bloques = disponibilidad.estado === 'listo' ? disponibilidad.bloques : []
  const proximosBloques = seleccionarProximosBloques(bloques, ahora)
  const disponibles = proximosBloques.filter((bloque) => bloque.estadoBloque === 'DISPONIBLE').length
  const reservados = proximosBloques.length - disponibles
  const siguiente = proximas?.[0]
  const accesoDenegado = solicitudes.estado === 'error' && solicitudes.tipo !== 'consulta'

  const indicadores = [
    {
      etiqueta: 'Solicitudes por responder',
      valor: solicitudes.estado === 'listo' ? String(pendientes.length) : '—',
      detalle: 'Plazo de 24 horas desde su envío',
    },
    {
      etiqueta: 'Próxima sesión',
      valor: proximas === null ? '—' : siguiente ? formatearHorarioSesion(siguiente.inicio, siguiente.fin) : 'Sin sesiones',
      detalle: siguiente ? nombreMateria(siguiente.id_materia) : 'Confirmadas y por realizar',
    },
    {
      etiqueta: 'Bloques disponibles',
      valor: disponibilidad.estado === 'listo' ? String(disponibles) : '—',
      detalle: disponibilidad.estado === 'listo' ? `${reservados} ${reservados === 1 ? 'reservado' : 'reservados'} desde hoy` : 'Desde hoy',
    },
    {
      etiqueta: 'Tutorías completadas',
      valor: completadas === null ? '—' : String(completadas),
      detalle: 'En todo tu historial',
    },
  ]

  return (
    <main className="dashboard-tutor">
      <section className="dashboard-tutor__bienvenida" aria-labelledby="dashboard-tutor-saludo">
        <div className="dashboard-tutor__interior dashboard-tutor__cabecera">
          <div>
            <h1 id="dashboard-tutor-saludo">Hola{nombre?.trim() ? `, ${nombre.trim()}` : ''}</h1>
            <p>Este es el resumen de tu actividad como tutor.</p>
          </div>
          <button
            type="button"
            className="boton-global boton-global--secundario"
            disabled={actualizando || aceptacion.estado === 'aceptando' || disponibilidad.estado === 'cargando'}
            onClick={onActualizar}
          >
            {actualizando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </section>

      <div className="dashboard-tutor__interior dashboard-tutor__contenido">
        <ul className="dashboard-tutor__indicadores" aria-label="Resumen de actividad">
          {indicadores.map(({ etiqueta, valor, detalle }) => (
            <li key={etiqueta}>
              <span>{etiqueta}</span>
              <strong>{valor}</strong>
              <small>{detalle}</small>
            </li>
          ))}
        </ul>

        <section className="dashboard-tutor__panel dashboard-tutor__solicitudes" aria-labelledby="dashboard-tutor-solicitudes"
          aria-busy={solicitudes.estado === 'cargando' || actualizando}>
          <div className="dashboard-tutor__titulo">
            <h2 id="dashboard-tutor-solicitudes">Solicitudes recibidas</h2>
            <Link to="/solicitudes/recibidas">
              Ver todas{solicitudes.estado === 'listo' ? ` (${pendientes.length})` : ''} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ResultadoAceptacionSolicitud aceptacion={aceptacion} />
          {errorActualizacion && (
            <div className="solicitudes-recibidas__aviso solicitudes-recibidas__aviso--error" role="alert">
              <p>{errorActualizacion} Se muestran los últimos datos confirmados.</p>
            </div>
          )}
          {solicitudes.estado === 'cargando' ? <EstadoSolicitudes estado="cargando" />
            : solicitudes.estado === 'error' ? (
              <EstadoSolicitudes estado={solicitudes.tipo === 'consulta' ? 'error' : solicitudes.tipo} mensaje={solicitudes.mensaje} onReintentar={onActualizar} />
            )
            : pendientes.length === 0 ? <EstadoSolicitudes estado="vacio" />
            : (
              <>
                <ListadoSolicitudes
                  solicitudes={pendientes.slice(0, SOLICITUDES_VISIBLES)}
                  materias={materias}
                  ahora={ahora}
                  renderizarAcciones={(solicitud) => (
                    <AccionAceptarSolicitud solicitud={solicitud} aceptacion={aceptacion} bloqueada={bloqueada} onAceptar={onAceptar} />
                  )}
                />
                {pendientes.length > SOLICITUDES_VISIBLES && (
                  <p className="dashboard-tutor__mas">
                    Y {pendientes.length - SOLICITUDES_VISIBLES} más. <Link to="/solicitudes/recibidas">Revisar todas las solicitudes</Link>
                  </p>
                )}
              </>
            )}
        </section>

        <div className="dashboard-tutor__columnas">
          <section className="dashboard-tutor__panel" aria-labelledby="dashboard-tutor-proximas" aria-busy={proximas === null && !accesoDenegado}>
            <div className="dashboard-tutor__titulo">
              <h2 id="dashboard-tutor-proximas">Próximas sesiones</h2>
            </div>
            {proximas === null ? (
              solicitudes.estado === 'error'
                ? <p role="alert">No pudimos cargar tus sesiones. {accesoDenegado ? '' : 'Pulsa Actualizar para reintentar.'}</p>
                : <p role="status">Cargando tus sesiones…</p>
            ) : proximas.length === 0 ? (
              <p className="dashboard-tutor__vacio">No tienes sesiones confirmadas próximamente. Al aceptar una solicitud aparecerá aquí.</p>
            ) : (
              <ul className="dashboard-tutor__lista">
                {proximas.slice(0, SESIONES_VISIBLES).map((clase) => (
                  <li key={clase.id_sesion}>
                    <div>
                      <strong>{nombreMateria(clase.id_materia)}</strong>
                      <span>Estudiante #{clase.id_tutee}</span>
                    </div>
                    <time dateTime={clase.inicio}>{formatearHorarioSesion(clase.inicio, clase.fin)}</time>
                    {Date.parse(clase.inicio) <= ahora && <span className="dashboard-tutor__estado dashboard-tutor__estado--curso">En curso</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dashboard-tutor__panel" aria-labelledby="dashboard-tutor-disponibilidad" aria-busy={disponibilidad.estado === 'cargando'}>
            <div className="dashboard-tutor__titulo">
              <h2 id="dashboard-tutor-disponibilidad">Tu disponibilidad</h2>
              <Link to="/disponibilidad">Gestionar <span aria-hidden="true">→</span></Link>
            </div>
            {disponibilidad.estado === 'cargando' ? <p role="status">Cargando tu disponibilidad…</p>
              : disponibilidad.estado === 'error' ? (
                <div role="alert">
                  <p>{disponibilidad.mensaje}</p>
                  <button type="button" className="boton-global boton-global--secundario" onClick={onRecargarDisponibilidad}>Reintentar</button>
                </div>
              )
              : proximosBloques.length === 0 ? (
                <div className="dashboard-tutor__vacio">
                  <p>No tienes bloques publicados desde hoy. Los estudiantes solo pueden solicitarte tutorías en tus bloques disponibles.</p>
                  <Link to="/disponibilidad" className="boton-global boton-global--primario">Agregar disponibilidad</Link>
                </div>
              )
              : (
                <ul className="dashboard-tutor__lista">
                  {proximosBloques.slice(0, BLOQUES_VISIBLES).map((bloque) => (
                    <li key={bloque.idBloque}>
                      <div>
                        <strong>{formatearDiaBloque(bloque.dia)}</strong>
                        <span>{bloque.horaInicio}–{bloque.horaFin}</span>
                      </div>
                      <span className={'dashboard-tutor__estado dashboard-tutor__estado--' + bloque.estadoBloque.toLowerCase()}>
                        {ETIQUETA_BLOQUE[bloque.estadoBloque]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </div>
      </div>
    </main>
  )
}
