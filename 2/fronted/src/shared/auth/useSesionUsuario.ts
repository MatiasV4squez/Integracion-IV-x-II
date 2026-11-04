import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { interpretarSesion } from './sesion-usuario'
import { obtenerNombreUsuario } from './usuario-autenticado'

function leerToken() {
  try { return typeof window === 'undefined' ? null : window.localStorage.getItem('token') }
  catch { return null }
}

function leerUsuario() {
  try { return typeof window === 'undefined' ? null : window.localStorage.getItem('usuario') }
  catch { return null }
}

function suscribir(notificar: () => void) {
  window.addEventListener('storage', notificar)
  window.addEventListener('focus', notificar)
  window.addEventListener('stp:sesion', notificar)
  return () => {
    window.removeEventListener('storage', notificar)
    window.removeEventListener('focus', notificar)
    window.removeEventListener('stp:sesion', notificar)
  }
}

// El login puede emitir stp:sesion al guardar o retirar el token en esta pestaña.
export function useSesionUsuario() {
  const token = useSyncExternalStore(suscribir, leerToken, () => null)
  const usuarioGuardado = useSyncExternalStore(suscribir, leerUsuario, () => null)
  const [ahora, setAhora] = useState(Date.now)
  const sesion = useMemo(() => {
    const actual = interpretarSesion(token, ahora)
    return actual ? { ...actual, nombre: obtenerNombreUsuario(actual.idUsuario, usuarioGuardado) } : null
  }, [token, ahora, usuarioGuardado])
  const expiraEn = sesion?.expiraEn

  useEffect(() => {
    if (!expiraEn) return
    const temporizador = window.setTimeout(() => setAhora(Date.now()), Math.min(expiraEn - Date.now() + 1, 2147483647))
    return () => window.clearTimeout(temporizador)
  }, [expiraEn, ahora])

  return sesion
}
