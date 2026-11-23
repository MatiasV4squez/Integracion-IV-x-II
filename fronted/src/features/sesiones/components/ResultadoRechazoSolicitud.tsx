import { Link } from 'react-router'
import type { RechazoSolicitud } from '../models/bandeja-solicitudes'

export function ResultadoRechazoSolicitud({ rechazo }: { rechazo: RechazoSolicitud }) {
  if (rechazo.estado === 'inicial') return null
  if (rechazo.estado === 'rechazando') return (
    <p className="solicitudes-recibidas__aviso" role="status">Rechazando la solicitud #{rechazo.idSesion}…</p>
  )
  if (rechazo.estado === 'rechazada') return (
    <p className="solicitudes-recibidas__aviso" role="status">Solicitud #{rechazo.idSesion} rechazada.</p>
  )
  return (
    <div className="solicitudes-recibidas__aviso solicitudes-recibidas__aviso--error" role="alert">
      <p>Solicitud #{rechazo.idSesion}: {rechazo.mensaje}</p>
      {rechazo.tipo === 'sesion' && <Link to="/login">Iniciar sesión</Link>}
    </div>
  )
}
