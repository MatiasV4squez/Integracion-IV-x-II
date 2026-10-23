import type { AceptacionSolicitud } from '../models/bandeja-solicitudes'
import type { Sesion } from '../models/sesion'

interface AccionAceptarSolicitudProps {
  solicitud: Sesion
  aceptacion: AceptacionSolicitud
  bloqueada: boolean
  onAceptar: (idSesion: string) => void
}

export function AccionAceptarSolicitud({ solicitud, aceptacion, bloqueada, onAceptar }: AccionAceptarSolicitudProps) {
  const aceptando = aceptacion.estado === 'aceptando' && aceptacion.idSesion === solicitud.id_sesion
  return (
    <button type="button" className="solicitudes-recibidas__boton listado-solicitudes__aceptar"
      disabled={bloqueada} aria-busy={aceptando}
      aria-label={(aceptando ? 'Aceptando' : 'Aceptar') + ' solicitud #' + solicitud.id_sesion + ' de estudiante #' + solicitud.id_tutee}
      onClick={() => onAceptar(solicitud.id_sesion)}>
      {aceptando ? 'Aceptando…' : 'Aceptar solicitud'}
    </button>
  )
}
