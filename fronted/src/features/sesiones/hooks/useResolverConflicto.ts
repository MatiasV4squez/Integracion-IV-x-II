import { useEffect, useRef, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { ErrorResolverConflicto, resolverConflicto, type EntradaResolucionConflicto } from '../services/resolver-conflicto-api'

export function useResolverConflicto(sesion: SesionUsuario, idSesion: string, recargar: () => void) {
  const enCurso = useRef<AbortController | null>(null)
  const [resolviendo, setResolviendo] = useState(false)
  const [error, setError] = useState<ErrorResolverConflicto | null>(null)
  const [resuelto, setResuelto] = useState(false)

  useEffect(() => () => enCurso.current?.abort(), [])

  async function resolver(entrada: EntradaResolucionConflicto) {
    if (enCurso.current || resuelto || error?.comprobarEstado) return
    const controlador = new AbortController()
    enCurso.current = controlador
    setResolviendo(true)
    setError(null)
    try {
      await resolverConflicto(idSesion, sesion, entrada, controlador.signal)
      if (controlador.signal.aborted) return
      setResuelto(true)
      recargar()
    } catch (fallo) {
      if (controlador.signal.aborted) return
      setError(fallo instanceof ErrorResolverConflicto ? fallo
        : new ErrorResolverConflicto('No pudimos confirmar la resolución. Actualiza el detalle para comprobar el estado.', true))
    } finally {
      enCurso.current = null
      if (!controlador.signal.aborted) setResolviendo(false)
    }
  }

  function actualizar() {
    if (enCurso.current) return
    setError(null)
    recargar()
  }

  return { resolver, resolviendo, error, resuelto, actualizar }
}
