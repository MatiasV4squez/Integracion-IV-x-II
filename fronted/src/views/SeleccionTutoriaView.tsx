import { useEffect, useState } from 'react'
import './SeleccionTutoriaView.css'
import { SelectorTutorBloque } from '../components/SelectorTutorBloque'
import type { SeleccionTutoria, TutorDisponible } from '../types/seleccion-tutoria'
import { crearSolicitudTutoria, type SesionCreada } from '../service/sesiones'
import { obtenerTutores } from '../service/tutores'

interface Propiedades {
  idMateria: string
  nombreMateria: string
}

export function SeleccionTutoriaView({ idMateria, nombreMateria }: Propiedades) {
  const [tutores, establecerTutores] = useState<TutorDisponible[]>([])
  const [cargando, establecerCargando] = useState(true)
  const [errorCarga, establecerErrorCarga] = useState<string | null>(null)
  const [seleccion, establecerSeleccion] = useState<SeleccionTutoria | null>(null)

  useEffect(() => {
    const controlador = new AbortController()

    async function cargarTutores() {
      establecerCargando(true)
      establecerErrorCarga(null)
      establecerTutores([])

      try {
        const datos = await obtenerTutores(idMateria, controlador.signal)
        if (!controlador.signal.aborted) establecerTutores(datos)
      } catch (fallo) {
        if (!controlador.signal.aborted) {
          establecerErrorCarga(
            fallo instanceof TypeError
              ? 'No se pudo conectar con el servidor.'
              : fallo instanceof Error
                ? fallo.message
                : 'No se pudieron cargar los tutores.',
          )
        }
      } finally {
        if (!controlador.signal.aborted) establecerCargando(false)
      }
    }

    void cargarTutores()
    return () => controlador.abort()
  }, [idMateria])

  const seleccionVigente = seleccion?.id_materia === idMateria ? seleccion : null
  const tutorSeleccionado = tutores.find((tutor) => tutor.idTutor === seleccionVigente?.id_tutor)
  const [enviando, establecerEnviando] = useState(false)
  const [error, establecerError] = useState<string | null>(null)
  const [sesionCreada, establecerSesionCreada] = useState<SesionCreada | null>(null)
  const bloqueSeleccionado = tutorSeleccionado?.horariosDisponibles.find(
    (bloque) => bloque.idBloque === seleccionVigente?.id_bloque,
  )

  async function enviarSolicitud() {
    if (
      cargando ||
      errorCarga ||
      !seleccionVigente ||
      !bloqueSeleccionado ||
      enviando ||
      sesionCreada
    ) {
      return
    }

    const token = localStorage.getItem('token')

    if (!token) {
      establecerError('Debes iniciar sesión para solicitar una tutoría.')
      return
    }

    establecerError(null)
    establecerEnviando(true)

    try {
      const sesion = await crearSolicitudTutoria(seleccionVigente, token)
      establecerSesionCreada(sesion)
    } catch (fallo) {
      establecerError(
        fallo instanceof TypeError
          ? 'No se pudo conectar con el servidor.'
          : fallo instanceof Error
            ? fallo.message
            : 'No se pudo enviar la solicitud.',
      )
    } finally {
      establecerEnviando(false)
    }
  }

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
              alSeleccionar={establecerSeleccion}
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
            onClick={enviarSolicitud}
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
