import { Link } from 'react-router'
import type { AceptacionSolicitud } from '../models/bandeja-solicitudes'

export function ResultadoAceptacionSolicitud({ aceptacion }: { aceptacion: AceptacionSolicitud }) {
  if (aceptacion.estado === 'inicial') return null
  if (aceptacion.estado === 'aceptando') return (
    <p className="solicitudes-recibidas__aviso" role="status">Aceptando la solicitud #{aceptacion.idSesion}…</p>
  )
  if (aceptacion.estado === 'aceptada') return (
    <p className="solicitudes-recibidas__aviso" role="status">Solicitud #{aceptacion.idSesion} aceptada. La tutoría está confirmada.</p>
  )
  return (
    <div className="solicitudes-recibidas__aviso solicitudes-recibidas__aviso--error" role="alert">
      <p>Solicitud #{aceptacion.idSesion}: {aceptacion.mensaje}</p>
      {aceptacion.tipo === 'sesion' && <Link to="/login">Iniciar sesión</Link>}
    </div>
  )
}
