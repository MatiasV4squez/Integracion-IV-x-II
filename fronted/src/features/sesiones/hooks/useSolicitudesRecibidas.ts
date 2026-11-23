import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { crearBandejaSolicitudes } from '../aplicacion/bandeja-solicitudes'
import { aceptarSolicitud } from '../services/aceptar-solicitud-api'
import { rechazarSolicitud } from '../services/rechazar-solicitud-api'
import type { Sesion } from '../models/sesion'
import { consultarHistorialTutor } from '../services/sesiones-api'
import { seleccionarSolicitudesRecibidas } from '../utils/solicitudes-recibidas'

// alRecibirHistorial permite reutilizar la misma consulta en otras vistas del tutor, como su dashboard.
// Debe ser estable (por ejemplo, un setState): si cambia, la bandeja se reinicia y vuelve a consultar.
export function useSolicitudesRecibidas(sesion: SesionUsuario, alRecibirHistorial?: (historial: Sesion[]) => void) {
  const bandeja = useMemo(() => crearBandejaSolicitudes({
    consultar: async (signal) => {
      const historial = await consultarHistorialTutor(sesion, signal)
      signal.throwIfAborted()
      alRecibirHistorial?.(historial)
      return seleccionarSolicitudesRecibidas(historial, sesion.idUsuario)
    },
    aceptar: (idSesion, signal) => aceptarSolicitud(idSesion, sesion, signal),
    rechazar: (idSesion, signal) => rechazarSolicitud(idSesion, sesion, signal),
  }), [sesion, alRecibirHistorial])
  const estado = useSyncExternalStore(bandeja.suscribir, bandeja.obtenerEstado, bandeja.obtenerEstado)

  useEffect(() => {
    void bandeja.iniciar()
    return () => bandeja.detener()
  }, [bandeja])

  const errorDeAcceso = [estado.aceptacion, estado.rechazo].some((accion) => accion.estado === 'error'
    && ['sesion', 'permiso'].includes(accion.tipo))
  const procesando = estado.aceptacion.estado === 'aceptando' || estado.rechazo.estado === 'rechazando'
  const bloqueada = estado.actualizando || estado.necesitaActualizar || errorDeAcceso || procesando
  return { ...estado, bloqueada, recargar: bandeja.recargar, aceptar: bandeja.aceptar, rechazar: bandeja.rechazar }
}
