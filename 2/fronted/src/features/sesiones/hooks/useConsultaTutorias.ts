import { useCallback, useEffect, useState } from 'react'
import { ErrorConsultaTutorias, type ConsultaTutorias } from '../models/tutoria'

export function useConsultaTutorias<T>(identidad: string, consultar: (signal: AbortSignal) => Promise<T>) {
  const [intento, setIntento] = useState(0)
  const clave = JSON.stringify([identidad, intento])
  const [respuesta, setRespuesta] = useState<{ clave: string; consulta: ConsultaTutorias<T> }>({ clave, consulta: { estado: 'cargando' } })
  if (respuesta.clave !== clave) setRespuesta({ clave, consulta: { estado: 'cargando' } })
  const recargar = useCallback(() => setIntento((valor) => valor + 1), [])

  useEffect(() => {
    const controlador = new AbortController()
    consultar(controlador.signal).then((datos) => {
      if (!controlador.signal.aborted) setRespuesta({ clave, consulta: { estado: 'listo', datos } })
    }).catch((error: unknown) => {
      if (controlador.signal.aborted) return
      setRespuesta({ clave, consulta: {
        estado: 'error', tipo: error instanceof ErrorConsultaTutorias ? error.tipo : 'consulta',
        mensaje: error instanceof ErrorConsultaTutorias ? error.message : 'No pudimos cargar tus tutorías. Inténtalo nuevamente.',
      } })
    })
    return () => controlador.abort()
  }, [clave, consultar])

  useEffect(() => {
    const actualizar = () => { if (document.visibilityState === 'visible') recargar() }
    window.addEventListener('focus', actualizar)
    document.addEventListener('visibilitychange', actualizar)
    return () => {
      window.removeEventListener('focus', actualizar)
      document.removeEventListener('visibilitychange', actualizar)
    }
  }, [recargar])

  const consulta: ConsultaTutorias<T> = respuesta.clave === clave ? respuesta.consulta : { estado: 'cargando' }
  return { consulta, recargar }
}
