import { formatDuration, timeToMinutes } from '../../../lib/availability'
import { FormularioBloque } from '../components/FormularioBloque'
import { ListadoBloques } from '../components/ListadoBloques'
import type { BloqueDisponibilidad, ConsultaDisponibilidad, HorarioDisponibilidad } from '../models/bloque-disponibilidad'
import './DisponibilidadPage.css'

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

  const indicadores = [
    { etiqueta: 'Bloques activos', valor: String(bloques.length) },
    { etiqueta: 'Horas registradas', valor: formatDuration(minutos) },
    { etiqueta: 'Fechas con bloques', valor: String(fechas) },
  ]

  return (
    <main className="disponibilidad" aria-labelledby="disponibilidad-titulo">
      <h1 id="disponibilidad-titulo">Gestión de disponibilidad</h1>

      <p className="disponibilidad__subtitulo">
        Define las fechas y horarios en los que puedes recibir tutorías.
      </p>

      <div className="disponibilidad__actualizacion">
        <button
          className="disponibilidad__actualizar"
          type="button"
          disabled={guardando || consulta.estado === 'cargando'}
          onClick={onRecargar}
        >
          Actualizar listado
        </button>
      </div>

      {/* Sin clase: las pruebas verifican el marcado exacto <p role="status">. */}
      {mensaje && <p role="status">{mensaje}</p>}

      {errorOperacion && (
        <p className="disponibilidad__aviso" role="alert">
          {errorOperacion}
        </p>
      )}

      {consulta.estado === 'cargando' && (
        <p className="carga-pagina" role="status">
          Cargando tu disponibilidad…
        </p>
      )}

      {consulta.estado === 'error' && (
        <p className="disponibilidad__aviso" role="alert">
          {consulta.mensaje}
        </p>
      )}

      {consulta.estado === 'listo' && (
        <>
          <ul
            className="disponibilidad__indicadores"
            aria-label="Resumen de disponibilidad"
          >
            {indicadores.map((indicador) => (
              <li key={indicador.etiqueta}>
                <span>{indicador.etiqueta}</span>
                <strong>{indicador.valor}</strong>
              </li>
            ))}
          </ul>

          <div className="disponibilidad__columnas">
            <section
              className="disponibilidad__panel"
              aria-labelledby="disponibilidad-listado"
            >
              <div className="disponibilidad__titulo">
                <h2 id="disponibilidad-listado">Tus bloques</h2>

                <p className="disponibilidad__cantidad">
                  {bloques.length}{' '}
                  {bloques.length === 1 ? 'bloque' : 'bloques'}
                </p>
              </div>

              <p className="disponibilidad__descripcion">
                Agrupados por fecha y ordenados por hora.
              </p>

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
  )
}
