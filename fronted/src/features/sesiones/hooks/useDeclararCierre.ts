import { useEffect, useRef, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import type { EntradaCierre } from '../models/tutoria'
import { declararCierre, ErrorDeclararCierre } from '../services/declarar-cierre-api'

export function useDeclararCierre(sesion: SesionUsuario, idSesion: string, recargar: () => void) {
  const enCurso = useRef<AbortController | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ErrorDeclararCierre | null>(null)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => () => enCurso.current?.abort(), [])

  async function enviar(entrada: EntradaCierre) {
    if (enCurso.current || enviado || error?.comprobarEstado) return
    const controlador = new AbortController()
    enCurso.current = controlador
    setEnviando(true)
    setError(null)
    try {
      await declararCierre(idSesion, sesion, entrada, controlador.signal)
      if (controlador.signal.aborted) return
      setEnviado(true)
      recargar()
    } catch (fallo) {
      if (controlador.signal.aborted) return
      setError(fallo instanceof ErrorDeclararCierre ? fallo
        : new ErrorDeclararCierre('No pudimos confirmar el envío. Actualiza el detalle para comprobar el estado.', true))
    } finally {
      enCurso.current = null
      if (!controlador.signal.aborted) setEnviando(false)
    }
  }

  function actualizar() {
    if (enCurso.current) return
    setError(null)
    recargar()
  }

  return { enviar, enviando, error, enviado, actualizar }
}
