import { useCallback, useEffect, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import type { ConsultaSolicitudes } from '../models/sesion'
import { consultarSolicitudesRecibidas, ErrorConsultaSesiones } from '../services/sesiones-api'

export function useSolicitudesRecibidas(sesion: SesionUsuario) {
  const [intento, setIntento] = useState(0)
  const clave = JSON.stringify([sesion.token, sesion.idUsuario, intento])
  const [respuesta, setRespuesta] = useState<{ clave: string; consulta: ConsultaSolicitudes }>({ clave, consulta: { estado: 'cargando' } })
  if (respuesta.clave !== clave) setRespuesta({ clave, consulta: { estado: 'cargando' } })

  useEffect(() => {
    const controlador = new AbortController()
    consultarSolicitudesRecibidas(sesion, controlador.signal)
      .then((solicitudes) => {
        if (!controlador.signal.aborted) setRespuesta({ clave, consulta: { estado: 'listo', solicitudes } })
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        const mensaje = error instanceof ErrorConsultaSesiones ? error.message : 'No pudimos cargar las solicitudes. Inténtalo de nuevo.'
        const tipo = error instanceof ErrorConsultaSesiones ? error.tipo : 'consulta'
        setRespuesta({ clave, consulta: { estado: 'error', mensaje, tipo } })
      })
    return () => controlador.abort()
  }, [clave, sesion])

  const recargar = useCallback(() => setIntento((actual) => actual + 1), [])

  return { consulta: respuesta.clave === clave ? respuesta.consulta : { estado: 'cargando' } as ConsultaSolicitudes,
    recargar }
}
