import { useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { ErrorCancelarSesion } from '../models/error-sesiones'
import { cancelarSesion } from '../services/cancelar-sesion-api'

export function useCancelarSesion(sesion: SesionUsuario) {
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [canceladas, setCanceladas] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  async function cancelar(idSesion: string) {
    if (cancelando || !window.confirm('¿Seguro que quieres cancelar esta sesión?')) return
    setCancelando(idSesion)
    setError(null)
    try {
      await cancelarSesion(idSesion, sesion)
      setCanceladas((actuales) => [...actuales, idSesion])
    } catch (e) {
      setError(e instanceof ErrorCancelarSesion ? e.message : 'No pudimos cancelar la sesión. Inténtalo de nuevo.')
    } finally {
      setCancelando(null)
    }
  }

  return { cancelando, canceladas, error, cancelar }
}

export type CancelacionSesiones = ReturnType<typeof useCancelarSesion>
