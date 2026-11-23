import type { AceptacionSolicitud, RechazoSolicitud } from '../models/bandeja-solicitudes'
import type { Sesion } from '../models/sesion'
import { AccionAceptarSolicitud } from './AccionAceptarSolicitud'

interface Propiedades {
  solicitud: Sesion
  aceptacion: AceptacionSolicitud
  rechazo: RechazoSolicitud
  bloqueada: boolean
  onAceptar?: (idSesion: string) => void
  onRechazar?: (idSesion: string) => void
}

export function AccionesSolicitud({ solicitud, aceptacion, rechazo, bloqueada, onAceptar, onRechazar }: Propiedades) {
  const rechazando = rechazo.estado === 'rechazando' && rechazo.idSesion === solicitud.id_sesion
  const deshabilitada = bloqueada || aceptacion.estado === 'aceptando' || rechazo.estado === 'rechazando'
  return (
    <div className="listado-solicitudes__acciones">
      {onAceptar && <AccionAceptarSolicitud solicitud={solicitud} aceptacion={aceptacion} bloqueada={deshabilitada} onAceptar={onAceptar} />}
      {onRechazar && <button type="button" className="solicitudes-recibidas__boton listado-solicitudes__rechazar"
        disabled={deshabilitada} aria-busy={rechazando}
        aria-label={(rechazando ? 'Rechazando' : 'Rechazar') + ' solicitud #' + solicitud.id_sesion + ' de estudiante #' + solicitud.id_tutee}
        onClick={() => onRechazar(solicitud.id_sesion)}>
        {rechazando ? 'Rechazando…' : 'Rechazar solicitud'}
      </button>}
    </div>
  )
}
