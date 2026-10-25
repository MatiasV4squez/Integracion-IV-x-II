import { SelectorTutorBloque } from '../../tutores/components/SelectorTutorBloque'
import type { TutorBusqueda } from '../../tutores/models/tutor-busqueda'
import type { SeleccionTutoria, SesionCreada } from '../models/solicitud-tutoria'
import './SolicitarTutoriaPage.css'

interface Propiedades {
  idMateria: string
  nombreMateria: string
  tutores: TutorBusqueda[]
  seleccion: SeleccionTutoria | null
  cargando: boolean
  errorCarga: string | null
  enviando: boolean
  error: string | null
  sesionCreada: SesionCreada | null
  alSeleccionar: (seleccion: SeleccionTutoria | null) => void
  alEnviar: () => void
}

export default function SolicitarTutoriaPage({
  idMateria, nombreMateria, tutores, seleccion, cargando, errorCarga,
  enviando, error, sesionCreada, alSeleccionar, alEnviar,
}: Propiedades) {
  const seleccionVigente = seleccion?.id_materia === idMateria ? seleccion : null
  const tutorSeleccionado = tutores.find((tutor) => tutor.idTutor === seleccionVigente?.id_tutor)
  const bloqueSeleccionado = tutorSeleccionado?.horariosDisponibles.find(
    (bloque) => bloque.idBloque === seleccionVigente?.id_bloque,
  )

  return (
    <main className="seleccion-tutoria">
      <aside className="seleccion-tutoria__tarjeta">
        <h2>{nombreMateria}</h2>

        {tutorSeleccionado ? (
          <>
            <h3>Tutor {tutorSeleccionado.idTutor}</h3>

            <p>
              {tutorSeleccionado.promedioCalificaciones === null
                ? 'Sin calificaciones todavía'
                : `Calificación: ${tutorSeleccionado.promedioCalificaciones}`}
            </p>
          </>
        ) : (
          <p>Elige un tutor y un horario para ver el resumen.</p>
        )}
      </aside>

      <section className="seleccion-tutoria__tarjeta">
        <h1>Agenda una tutoría</h1>
        <p>Selecciona un tutor y uno de sus bloques disponibles.</p>

        {cargando && <p role="status">Cargando tutores…</p>}
        {errorCarga && <p role="alert">{errorCarga}</p>}

        <fieldset
          disabled={cargando || errorCarga !== null || enviando || sesionCreada !== null}
          className="seleccion-tutoria__formulario"
        >
          {!cargando && !errorCarga && (
            <SelectorTutorBloque
              idMateria={idMateria}
              tutores={tutores}
              alSeleccionar={alSeleccionar}
            />
          )}
        </fieldset>

        <section className="seleccion-tutoria__resumen" aria-live="polite">
          <h2>Resumen</h2>

          {seleccionVigente && bloqueSeleccionado ? (
            <>
              <p>{nombreMateria}</p>
              <p>Con el tutor {seleccionVigente.id_tutor}</p>
              <p>
                {bloqueSeleccionado.dia} ·{' '}
                {bloqueSeleccionado.horaInicio}–
                {bloqueSeleccionado.horaFin}
              </p>
            </>
          ) : (
            <p>Selecciona un tutor y horario para continuar.</p>
          )}

          <button
            type="button"
            onClick={alEnviar}
            disabled={
              cargando ||
              errorCarga !== null ||
              !seleccionVigente ||
              !bloqueSeleccionado ||
              enviando ||
              sesionCreada !== null
            }
          >
            {enviando ? 'Enviando…' : 'Solicitar tutoría'}
          </button>

          {error && <p role="alert">{error}</p>}

          {sesionCreada && (
            <p role="status">
              Solicitud enviada. Pendiente de aceptación del tutor.
            </p>
          )}
        </section>
      </section>
    </main>
  )
}
