import { Icon } from '../../../components/Icon'
import { formatDuration, timeToMinutes } from '../../../lib/availability'
import { FormularioBloque } from '../components/FormularioBloque'
import { ListadoBloques } from '../components/ListadoBloques'
import type { BloqueDisponibilidad, ConsultaDisponibilidad, HorarioDisponibilidad } from '../models/bloque-disponibilidad'

interface Propiedades {
  consulta: ConsultaDisponibilidad
  bloqueEditado: BloqueDisponibilidad | null
  guardando: boolean
  errorOperacion: string | null
  mensaje: string | null
  onRecargar: () => void
  onEditar: (bloque: BloqueDisponibilidad) => void
  onGuardar: (horario: HorarioDisponibilidad) => Promise<boolean>
  onEliminar: (idBloque: string) => Promise<boolean>
  onCancelar: () => void
}

export default function DisponibilidadPage({
  consulta,
  bloqueEditado,
  guardando,
  errorOperacion,
  mensaje,
  onRecargar,
  onEditar,
  onGuardar,
  onEliminar,
  onCancelar,
}: Propiedades) {
  const bloques =
    consulta.estado === 'listo' ? consulta.bloques : []

  const minutos = bloques.reduce(
    (total, bloque) =>
      total +
      timeToMinutes(bloque.horaFin) -
      timeToMinutes(bloque.horaInicio),
    0,
  )

  const fechas = new Set(bloques.map((bloque) => bloque.dia)).size

  const estadisticas = [
    {
      etiqueta: 'Bloques activos',
      valor: bloques.length,
      icono: 'calendar',
      color: 'violet',
    },
    {
      etiqueta: 'Horas registradas',
      valor: formatDuration(minutos),
      icono: 'clock',
      color: 'blue',
    },
    {
      etiqueta: 'Fechas con bloques',
      valor: fechas,
      icono: 'check',
      color: 'amber',
    },
  ] as const

  return (
    <div className="disponibilidad-contenido">
      <main className="page">
        <section className="page-heading">
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Disponibilidad
          </p>

          <h1>Gestión de disponibilidad</h1>

          <p className="page-subtitle">
            Define las fechas y horarios en los que puedes recibir tutorías.
          </p>

          <button
            className="text-button"
            type="button"
            disabled={guardando || consulta.estado === 'cargando'}
            onClick={onRecargar}
          >
            Actualizar listado
          </button>
        </section>

        {mensaje && <p role="status">{mensaje}</p>}

        {errorOperacion && (
          <p className="form-alert" role="alert">
            {errorOperacion}
          </p>
        )}

        {consulta.estado === 'cargando' && (
          <p role="status">Cargando tu disponibilidad…</p>
        )}

        {consulta.estado === 'error' && (
          <p className="form-alert" role="alert">
            {consulta.mensaje}
          </p>
        )}

        {consulta.estado === 'listo' && (
          <>
            <section
              className="stats"
              aria-label="Resumen de disponibilidad"
            >
              {estadisticas.map((estadistica) => (
                <article
                  className="stat-card"
                  key={estadistica.etiqueta}
                >
                  <span
                    className={`stat-icon stat-icon--${estadistica.color}`}
                  >
                    <Icon name={estadistica.icono} size={20} />
                  </span>

                  <div>
                    <span className="stat-label">
                      {estadistica.etiqueta}
                    </span>
                    <strong className="stat-value">
                      {estadistica.valor}
                    </strong>
                  </div>
                </article>
              ))}
            </section>

            <div className="layout">
              <section
                className="panel schedule-panel"
                aria-labelledby="disponibilidad-listado"
              >
                <header className="panel-heading">
                  <div>
                    <h2 id="disponibilidad-listado">
                      Tus bloques
                    </h2>
                    <p>
                      Agrupados por fecha y ordenados por hora.
                    </p>
                  </div>

                  <span className="count-pill">
                    {bloques.length}{' '}
                    {bloques.length === 1 ? 'bloque' : 'bloques'}
                  </span>
                </header>

                <ListadoBloques
                  bloques={bloques}
                  idEdicion={bloqueEditado?.idBloque ?? null}
                  guardando={guardando}
                  onEditar={onEditar}
                  onEliminar={onEliminar}
                />
              </section>

              <FormularioBloque
                key={bloqueEditado?.idBloque ?? 'nuevo'}
                bloques={bloques}
                bloqueEditado={bloqueEditado}
                guardando={guardando}
                onGuardar={onGuardar}
                onCancelar={onCancelar}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}