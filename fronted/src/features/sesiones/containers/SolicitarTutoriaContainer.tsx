import { useEffect, useState } from 'react'
import type { TutorBusqueda } from '../../tutores/models/tutor-busqueda'
import { obtenerTutores } from '../../tutores/services/disponibilidad-tutores-api'
import type { SeleccionTutoria, SesionCreada } from '../models/solicitud-tutoria'
import SolicitarTutoriaPage from '../pages/SolicitarTutoriaPage'
import { crearSolicitudTutoria } from '../services/crear-solicitud-api'

interface Propiedades {
  idMateria: string
  nombreMateria: string
}

export default function SolicitarTutoriaContainer({ idMateria, nombreMateria }: Propiedades) {
  const [tutores, establecerTutores] = useState<TutorBusqueda[]>([])
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
    <SolicitarTutoriaPage
      idMateria={idMateria}
      nombreMateria={nombreMateria}
      tutores={tutores}
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
