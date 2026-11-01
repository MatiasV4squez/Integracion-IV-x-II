import { useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { useMaterias } from '../../materias/hooks/useMaterias'
import type { TutorBusqueda } from '../../tutores/models/tutor-busqueda'
import { obtenerTutores } from '../../tutores/services/disponibilidad-tutores-api'
import { completarNombresTutores } from '../../tutores/services/nombres-tutores-api'
import type { SeleccionTutoria, SesionCreada } from '../models/solicitud-tutoria'
import SolicitarTutoriaPage from '../pages/SolicitarTutoriaPage'
import { crearSolicitudTutoria, ErrorCrearSolicitud } from '../services/crear-solicitud-api'

interface Propiedades {
  sesion: SesionUsuario
  idMateria: string
  nombreMateria: string
  idTutorInicial: string
}

function SolicitudDeMateria({ sesion, idMateria, nombreMateria, idTutorInicial }: Propiedades) {
  const [tutores, establecerTutores] = useState<TutorBusqueda[]>([])
  const [cargando, establecerCargando] = useState(true)
  const [errorCarga, establecerErrorCarga] = useState<string | null>(null)
  const [seleccion, establecerSeleccion] = useState<SeleccionTutoria | null>(null)
  const [intentoCarga, establecerIntentoCarga] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()

    async function cargarTutores() {
      establecerCargando(true)
      establecerErrorCarga(null)
      establecerTutores([])

      try {
        const datos = await obtenerTutores(idMateria, controlador.signal)
        // Agendamiento rechaza que el estudiante se solicite tutoría a sí mismo.
        const disponibles = await completarNombresTutores(
          datos.filter((tutor) => tutor.idTutor !== sesion.idUsuario), sesion.token, controlador.signal)
        if (!controlador.signal.aborted) establecerTutores(disponibles)
      } catch (fallo) {
        if (!controlador.signal.aborted) {
          establecerErrorCarga(fallo instanceof Error ? fallo.message : 'No se pudieron cargar los tutores.')
        }
      } finally {
        if (!controlador.signal.aborted) establecerCargando(false)
      }
    }

    void cargarTutores()
    return () => controlador.abort()
  }, [idMateria, sesion.idUsuario, sesion.token, intentoCarga])

  const seleccionVigente = seleccion?.id_materia === idMateria ? seleccion : null
  const tutorSeleccionado = tutores.find((tutor) => tutor.idTutor === seleccionVigente?.id_tutor)
  const [enviando, establecerEnviando] = useState(false)
  const [error, establecerError] = useState<string | null>(null)
  const [sesionCreada, establecerSesionCreada] = useState<SesionCreada | null>(null)
  const envio = useRef<AbortController | null>(null)
  useEffect(() => () => envio.current?.abort(), [])
  const bloqueSeleccionado = tutorSeleccionado?.horariosDisponibles.find(
    (bloque) => bloque.idBloque === seleccionVigente?.id_bloque,
  )

  async function enviarSolicitud() {
    if (
      cargando ||
      errorCarga ||
      !seleccionVigente ||
      !bloqueSeleccionado ||
      envio.current ||
      sesionCreada
    ) {
      return
    }

    const control = new AbortController()
    envio.current = control
    establecerError(null)
    establecerEnviando(true)

    try {
      const creada = await crearSolicitudTutoria(seleccionVigente, sesion.token, control.signal)
      if (!control.signal.aborted) establecerSesionCreada(creada)
    } catch (fallo) {
      if (control.signal.aborted) return
      establecerError(fallo instanceof Error ? fallo.message : 'No se pudo enviar la solicitud.')
      if (fallo instanceof ErrorCrearSolicitud && fallo.requiereRecargarHorarios) {
        establecerSeleccion(null)
        establecerIntentoCarga((actual) => actual + 1)
      }
    } finally {
      if (envio.current === control) {
        envio.current = null
        establecerEnviando(false)
      }
    }
  }

  return (
    <SolicitarTutoriaPage
      idMateria={idMateria}
      nombreMateria={nombreMateria}
      tutores={tutores}
      idTutorInicial={idTutorInicial}
      seleccion={seleccionVigente}
      cargando={cargando}
      errorCarga={errorCarga}
      enviando={enviando}
      error={error}
      sesionCreada={sesionCreada}
      alSeleccionar={establecerSeleccion}
      alEnviar={enviarSolicitud}
    />
  )
}

export default function SolicitarTutoriaContainer() {
  const sesion = useSesionUsuario()
  const [parametros] = useSearchParams()
  const { consulta: catalogo, recargar, revalidarSiFalta, actualizando } = useMaterias()
  const idMateria = parametros.get('materiaId') ?? ''
  const idTutor = parametros.get('tutorId') ?? ''
  useEffect(() => { if (idMateria) revalidarSiFalta(idMateria) }, [idMateria, revalidarSiFalta])

  // RutaProtegida exige la sesión de estudiante; esto solo evita renderizar sin ella.
  if (!sesion) return null

  const materia = catalogo.estado === 'listo'
    ? catalogo.materias.find((item) => item.idMateria === idMateria) : undefined
  if (!idMateria || (catalogo.estado === 'listo' && !materia && !actualizando)) return <Navigate to="/tutores" replace />

  if (!materia) return (
    <main className="seleccion-tutoria">
      <section className="seleccion-tutoria__tarjeta">
        <h1>Agenda una tutoría</h1>
        {catalogo.estado !== 'error' ? <p role="status">Cargando materias…</p> : (
          <>
            <p role="alert">{catalogo.mensaje}</p>
            <button type="button" onClick={recargar}>Reintentar</button>
          </>
        )}
      </section>
    </main>
  )

  return (
    <SolicitudDeMateria
      key={materia.idMateria + ':' + sesion.idUsuario}
      sesion={sesion}
      idMateria={materia.idMateria}
      nombreMateria={materia.nombre}
      idTutorInicial={idTutor}
    />
  )
}
