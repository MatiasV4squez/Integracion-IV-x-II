import { useEffect, useRef, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import type { DetalleTutoria } from '../models/tutoria'
import { calificarTutoria, ErrorCalificarTutoria } from '../services/calificar-tutoria-api'

export function useCalificarTutoria(sesion: SesionUsuario, tutoria: DetalleTutoria | null, recargar: () => void) {
  const enCurso = useRef<AbortController | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const [error, setError] = useState<ErrorCalificarTutoria | null>(null)

  useEffect(() => () => enCurso.current?.abort(), [])

  async function enviar(puntuacion: number) {
    if (!tutoria || enCurso.current || enviada || error?.comprobarEstado) return
    const controlador = new AbortController()
    enCurso.current = controlador
    setError(null)
    setEnviando(true)
    try {
      await calificarTutoria(sesion, tutoria, puntuacion, controlador.signal)
      if (controlador.signal.aborted) return
      setEnviada(true)
      recargar()
    } catch (fallo) {
      if (controlador.signal.aborted) return
      setError(fallo instanceof ErrorCalificarTutoria ? fallo
        : new ErrorCalificarTutoria('No pudimos confirmar el envío. Actualiza el detalle.', true))
    } finally {
      enCurso.current = null
      if (!controlador.signal.aborted) setEnviando(false)
    }
  }

  return { enviar, enviando, enviada, error, limpiarError: () => setError(null) }
}
