import { useCallback, useEffect, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import type { ConsultaSesionesActivas, Sesion } from '../models/sesion'
import { ErrorConsultaSesiones } from '../models/error-sesiones'

type ConsultarSesiones = (sesion: SesionUsuario, signal?: AbortSignal) => Promise<Sesion[]>

export function useConsultaSesiones(sesion: SesionUsuario, consultar: ConsultarSesiones) {
  const [intento, setIntento] = useState(0)
  const clave = JSON.stringify([sesion.token, sesion.idUsuario, intento])
  const [respuesta, setRespuesta] = useState<{ clave: string; consulta: ConsultaSesionesActivas }>({ clave, consulta: { estado: 'cargando' } })
  if (respuesta.clave !== clave) setRespuesta({ clave, consulta: { estado: 'cargando' } })

  useEffect(() => {
    const controlador = new AbortController()
    consultar(sesion, controlador.signal)
      .then((sesiones) => {
        if (!controlador.signal.aborted) setRespuesta({ clave, consulta: { estado: 'listo', sesiones } })
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        const mensaje = error instanceof ErrorConsultaSesiones ? error.message : 'No pudimos cargar tus sesiones. Inténtalo de nuevo.'
        const tipo = error instanceof ErrorConsultaSesiones ? error.tipo : 'consulta'
        setRespuesta({ clave, consulta: { estado: 'error', mensaje, tipo } })
      })
    return () => controlador.abort()
  }, [clave, sesion, consultar])

  const recargar = useCallback(() => setIntento((actual) => actual + 1), [])
  const consulta: ConsultaSesionesActivas = respuesta.clave === clave
    ? respuesta.consulta : { estado: 'cargando' }

  return { consulta, recargar }
}
