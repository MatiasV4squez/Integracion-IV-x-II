import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { crearCancelacionSesiones } from '../aplicacion/cancelacion-sesiones'
import { cancelarSesion } from '../services/cancelar-sesion-api'

export function useCancelarSesion(sesion: SesionUsuario, consulta: { estado: string }, recargar: () => void) {
  const cancelacion = useMemo(() => crearCancelacionSesiones({
    idUsuario: sesion.idUsuario,
    cancelar: (id, signal) => cancelarSesion(id, sesion, signal),
    confirmar: () => window.confirm('¿Seguro que quieres cancelar esta tutoría?'),
    recargar,
  }), [sesion, recargar])
  const estado = useSyncExternalStore(cancelacion.suscribir, cancelacion.obtenerEstado, cancelacion.obtenerEstado)

  useEffect(() => {
    cancelacion.iniciar()
    return () => cancelacion.detener()
  }, [cancelacion])
  useEffect(() => { cancelacion.recibirConsulta(consulta) }, [cancelacion, consulta])

  const accesoDenegado = !!estado.error && ['sesion', 'permiso'].includes(estado.error.tipo)
  const puedeActualizar = estado.cancelando === null && !accesoDenegado
  return { ...estado, idUsuario: sesion.idUsuario, puedeActualizar,
    bloqueada: !puedeActualizar || estado.necesitaActualizar || consulta.estado !== 'listo',
    cancelar: cancelacion.cancelar, actualizar: cancelacion.actualizar }
}

export type CancelacionSesiones = ReturnType<typeof useCancelarSesion>
