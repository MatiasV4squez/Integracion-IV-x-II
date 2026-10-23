import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { crearBandejaSolicitudes } from '../aplicacion/bandeja-solicitudes'
import { aceptarSolicitud } from '../services/aceptar-solicitud-api'
import { consultarSolicitudesRecibidas } from '../services/sesiones-api'

export function useSolicitudesRecibidas(sesion: SesionUsuario) {
  const bandeja = useMemo(() => crearBandejaSolicitudes({
    consultar: (signal) => consultarSolicitudesRecibidas(sesion, signal),
    aceptar: (idSesion, signal) => aceptarSolicitud(idSesion, sesion, signal),
  }), [sesion])
  const estado = useSyncExternalStore(bandeja.suscribir, bandeja.obtenerEstado, bandeja.obtenerEstado)

  useEffect(() => {
    void bandeja.iniciar()
    return () => bandeja.detener()
  }, [bandeja])

  const errorDeAcceso = estado.aceptacion.estado === 'error'
    && ['sesion', 'permiso'].includes(estado.aceptacion.tipo)
  const bloqueada = estado.actualizando || estado.necesitaActualizar || errorDeAcceso || estado.aceptacion.estado === 'aceptando'
  return { ...estado, bloqueada, recargar: bandeja.recargar, aceptar: bandeja.aceptar }
}
