import { ErrorCancelarSesion } from '../models/error-sesiones'
import type { Sesion } from '../models/sesion'
import { puedeCancelar } from '../utils/sesiones-activas'

interface EstadoCancelacion {
  cancelando: string | null
  canceladas: string[]
  error: ErrorCancelarSesion | null
  necesitaActualizar: boolean
}

interface OperacionesCancelacion {
  idUsuario: string
  cancelar: (idSesion: string, signal: AbortSignal) => Promise<void>
  confirmar: () => boolean
  recargar: () => void
}

// Comparte la coordinación entre el listado y el detalle, sin depender de React.
export function crearCancelacionSesiones(operaciones: OperacionesCancelacion) {
  const inicial = (): EstadoCancelacion => ({ cancelando: null, canceladas: [], error: null, necesitaActualizar: false })
  let estado = inicial()
  let activa = false
  let escritura: AbortController | undefined
  let consulta: { estado: string } | undefined
  const oyentes = new Set<() => void>()
  const accesoDenegado = () => !!estado.error && ['sesion', 'permiso'].includes(estado.error.tipo)

  function publicar(cambios: Partial<EstadoCancelacion>) {
    if (!activa) return
    estado = { ...estado, ...cambios }
    oyentes.forEach((notificar) => notificar())
  }

  function actualizar() {
    if (activa && !escritura && !accesoDenegado()) operaciones.recargar()
  }

  async function cancelar(sesion: Sesion) {
    if (!activa || escritura || estado.necesitaActualizar || accesoDenegado() || consulta?.estado !== 'listo'
      || estado.canceladas.includes(sesion.id_sesion) || !puedeCancelar(sesion, operaciones.idUsuario)) return
    if (!operaciones.confirmar()) return
    const controlador = new AbortController()
    escritura = controlador
    publicar({ cancelando: sesion.id_sesion, error: null })
    try {
      // La confirmación puede permanecer abierta hasta después del inicio.
      if (!puedeCancelar(sesion, operaciones.idUsuario)) {
        throw new ErrorCancelarSesion('La sesión ya comenzó; actualiza la vista para comprobar su estado.', 'conflicto')
      }
      await operaciones.cancelar(sesion.id_sesion, controlador.signal)
      if (!activa || escritura !== controlador || controlador.signal.aborted) return
      publicar({ canceladas: [...estado.canceladas, sesion.id_sesion], necesitaActualizar: true })
    } catch (error) {
      if (!activa || escritura !== controlador || controlador.signal.aborted) return
      const fallo = error instanceof ErrorCancelarSesion ? error
        : new ErrorCancelarSesion('No pudimos confirmar la cancelación. Actualiza la vista antes de volver a intentarlo.', 'incierto')
      publicar({ error: fallo, necesitaActualizar: !['sesion', 'permiso'].includes(fallo.tipo) })
    } finally {
      if (activa && escritura === controlador) {
        escritura = undefined
        publicar({ cancelando: null })
        // Se consulta el estado incluso tras un conflicto; nunca se repite el PATCH.
        actualizar()
      }
    }
  }

  return {
    obtenerEstado: () => estado,
    suscribir: (notificar: () => void) => { oyentes.add(notificar); return () => { oyentes.delete(notificar) } },
    iniciar: () => { activa = true; estado = inicial(); consulta = undefined },
    detener: () => { activa = false; escritura?.abort(); escritura = undefined },
    recibirConsulta: (nueva: { estado: string }) => {
      const actualizada = nueva !== consulta && nueva.estado === 'listo'
      consulta = nueva
      if (actualizada && estado.necesitaActualizar && !escritura) publicar({ necesitaActualizar: false })
    },
    actualizar,
    cancelar,
  }
}
