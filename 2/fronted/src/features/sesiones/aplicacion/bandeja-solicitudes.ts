import type { EstadoBandejaSolicitudes } from '../models/bandeja-solicitudes'
import { ErrorAceptarSolicitud, ErrorConsultaSesiones } from '../models/error-sesiones'
import type { Sesion } from '../models/sesion'

// Las operaciones se proporcionan desde el hook; la coordinación no depende de fetch ni de React.
interface OperacionesSolicitudes {
  consultar: (signal: AbortSignal) => Promise<Sesion[]>
  aceptar: (idSesion: string, signal: AbortSignal) => Promise<Sesion>
}

export function crearBandejaSolicitudes(operaciones: OperacionesSolicitudes) {
  const inicial = (): EstadoBandejaSolicitudes => ({
    consulta: { estado: 'cargando' }, actualizando: false,
    aceptacion: { estado: 'inicial' }, necesitaActualizar: false,
  })
  let estado = inicial()
  let activa = false
  let lectura: AbortController | undefined
  let escritura: AbortController | undefined
  const oyentes = new Set<() => void>()

  function publicar(cambios: Partial<EstadoBandejaSolicitudes>) {
    if (!activa) return
    estado = { ...estado, ...cambios }
    oyentes.forEach((notificar) => notificar())
  }

  function accesoDenegado() {
    return estado.aceptacion.estado === 'error'
      && ['sesion', 'permiso'].includes(estado.aceptacion.tipo)
  }

  async function recargar() {
    if (!activa || escritura || accesoDenegado()) return
    lectura?.abort()
    const controlador = new AbortController()
    lectura = controlador
    publicar({ actualizando: true, errorActualizacion: undefined,
      ...(estado.consulta.estado !== 'listo' ? { consulta: { estado: 'cargando' } as const } : {}) })
    try {
      const solicitudes = await operaciones.consultar(controlador.signal)
      if (!activa || lectura !== controlador || controlador.signal.aborted) return
      publicar({ consulta: { estado: 'listo', solicitudes }, necesitaActualizar: false })
    } catch (error) {
      if (!activa || lectura !== controlador || controlador.signal.aborted) return
      const mensaje = error instanceof ErrorConsultaSesiones ? error.message : 'No pudimos actualizar las solicitudes. Inténtalo nuevamente.'
      const tipo = error instanceof ErrorConsultaSesiones ? error.tipo : 'consulta'
      if (estado.consulta.estado === 'listo' && tipo === 'consulta') {
        publicar({ errorActualizacion: mensaje })
      } else {
        publicar({ consulta: { estado: 'error', mensaje, tipo } })
      }
    } finally {
      if (activa && lectura === controlador) {
        lectura = undefined
        publicar({ actualizando: false })
      }
    }
  }

  async function aceptar(idSesion: string) {
    if (!activa || escritura || estado.actualizando || estado.necesitaActualizar || accesoDenegado()
      || estado.consulta.estado !== 'listo' || !estado.consulta.solicitudes.some((solicitud) => solicitud.id_sesion === idSesion)) return
    // El bloqueo se establece antes del primer await: dos clics no producen dos PATCH.
    const controlador = new AbortController()
    escritura = controlador
    publicar({ aceptacion: { estado: 'aceptando', idSesion }, errorActualizacion: undefined })
    try {
      await operaciones.aceptar(idSesion, controlador.signal)
      if (!activa || escritura !== controlador || controlador.signal.aborted) return
      // La fila se elimina únicamente después de una confirmación válida de la API.
      publicar({ aceptacion: { estado: 'aceptada', idSesion }, consulta: {
        estado: 'listo', solicitudes: estado.consulta.estado === 'listo'
          ? estado.consulta.solicitudes.filter((solicitud) => solicitud.id_sesion !== idSesion) : [],
      } })
    } catch (error) {
      if (!activa || escritura !== controlador || controlador.signal.aborted) return
      const fallo = error instanceof ErrorAceptarSolicitud ? error
        : new ErrorAceptarSolicitud('No pudimos confirmar el resultado. Actualiza el listado antes de volver a aceptar.', 'incierto')
      publicar({ aceptacion: { estado: 'error', idSesion, mensaje: fallo.message, tipo: fallo.tipo },
        necesitaActualizar: !['sesion', 'permiso'].includes(fallo.tipo) })
    } finally {
      if (activa && escritura === controlador) {
        escritura = undefined
        // Siempre se reconcilia mediante GET; nunca se reintenta automáticamente el PATCH.
        if (!accesoDenegado()) await recargar()
      }
    }
  }

  return {
    obtenerEstado: () => estado,
    suscribir: (notificar: () => void) => { oyentes.add(notificar); return () => { oyentes.delete(notificar) } },
    iniciar: () => { activa = true; estado = inicial(); return recargar() },
    detener: () => {
      activa = false
      lectura?.abort()
      escritura?.abort()
      lectura = undefined
      escritura = undefined
    },
    recargar,
    aceptar,
  }
}
