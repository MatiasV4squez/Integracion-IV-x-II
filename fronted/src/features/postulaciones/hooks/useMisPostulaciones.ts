import { useEffect, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import type { ConsultaPostulaciones } from '../models/postulacion'
import { consultarMisPostulaciones } from '../services/postulacion-tutor-api'

export function useMisPostulaciones(sesion: SesionUsuario) {
  const [consulta, setConsulta] = useState<ConsultaPostulaciones>({ estado: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    consultarMisPostulaciones(sesion, controlador.signal)
      .then((postulaciones) => {
        if (!controlador.signal.aborted) setConsulta({ estado: 'listo', postulaciones })
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        setConsulta({
          estado: 'error',
          mensaje: error instanceof Error ? error.message : 'No se pudieron cargar tus postulaciones.',
        })
      })
    return () => controlador.abort()
  }, [sesion, intento])

  function recargar() {
    setConsulta({ estado: 'cargando' })
    setIntento((actual) => actual + 1)
  }

  return { consulta, recargar }
}
