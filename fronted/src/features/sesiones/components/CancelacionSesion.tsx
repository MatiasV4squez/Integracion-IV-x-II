import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { CancelacionSesiones } from '../hooks/useCancelarSesion'
import type { Sesion } from '../models/sesion'
import { puedeCancelar } from '../utils/sesiones-activas'
import './CancelacionSesion.css'

export function AccionCancelarSesion({ sesion, cancelacion, permitida = true, bloqueada = false }: {
  sesion: Sesion; cancelacion?: CancelacionSesiones; permitida?: boolean; bloqueada?: boolean
}) {
  const [ahora, setAhora] = useState(Date.now)
  useEffect(() => {
    const espera = Date.parse(sesion.inicio) - Date.now()
    if (sesion.estado_sesion !== 'CONFIRMADA' || espera <= 0) return
    const temporizador = window.setTimeout(() => setAhora(Date.now()), Math.min(espera, 2147483647))
    return () => window.clearTimeout(temporizador)
  }, [sesion.inicio, sesion.estado_sesion, ahora])

  if (!cancelacion || !permitida || cancelacion.canceladas.includes(sesion.id_sesion)
    || !puedeCancelar(sesion, cancelacion.idUsuario)) return null
  const cancelando = cancelacion.cancelando === sesion.id_sesion
  return <button type="button" className="cancelar-sesion__boton"
    disabled={bloqueada || cancelacion.bloqueada} aria-busy={cancelando}
    aria-label={'Cancelar tutoría #' + sesion.id_sesion} onClick={() => cancelacion.cancelar(sesion)}>
    {cancelando ? 'Cancelando…' : 'Cancelar tutoría'}
  </button>
}

export function ResultadoCancelacionSesion({ cancelacion }: { cancelacion?: CancelacionSesiones }) {
  if (!cancelacion) return null
  if (cancelacion.cancelando) return <p role="status">Cancelando la tutoría #{cancelacion.cancelando}…</p>
  if (cancelacion.error) return <div className="cancelar-sesion__error" role="alert">
    <p>{cancelacion.error.message}</p>
    {cancelacion.error.tipo === 'sesion' && <Link to="/login">Iniciar sesión</Link>}
  </div>
  const ultima = cancelacion.canceladas.at(-1)
  return ultima ? <p role="status">Tutoría #{ultima} cancelada.</p> : null
}
