import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { mensajeDeError } from '../../../shared/utils/mensaje-error'
import { obtenerNombresUsuarios } from '../../tutores/services/nombres-tutores-api'
import { ErrorModeracionReporte } from '../models/error-moderacion-reporte'
import type {
  AccionModeracion,
  ConsultaReportes,
  EstadoReporte,
  Reporte,
  ResolucionReporte,
} from '../models/reporte'
import ReportesAdminPage from '../pages/ReportesAdminPage'
import { consultarReportesAdmin, reactivarSuspension, resolverReporte } from '../services/reportes-admin-api'
import { leerFiltrosReportes, parametrosDeFiltros } from '../utils/leer-parametros-reportes'

interface CambioFiltros {
  estado?: EstadoReporte
  fechaDesde?: string
  fechaHasta?: string
}

const MENSAJES_RESOLUCION: Record<ResolucionReporte, string> = {
  DESESTIMADO: 'Reporte desestimado correctamente.',
  ADVERTIDO: 'Advertencia registrada correctamente.',
  SUSPENDIDO: 'Reporte resuelto y cuenta suspendida.',
}

function ReportesDelAdministrador({ sesion }: { sesion: SesionUsuario }) {
  const [parametros, establecerParametros] = useSearchParams()
  const filtros = useMemo(() => leerFiltrosReportes(parametros), [parametros])
  const [recarga, establecerRecarga] = useState(0)
  const clave = JSON.stringify([filtros.estado ?? '', filtros.fechaDesde ?? '', filtros.fechaHasta ?? '', filtros.pagina, recarga])
  const rangoInvalido = Boolean(filtros.fechaDesde && filtros.fechaHasta && filtros.fechaDesde > filtros.fechaHasta)
  const [respuesta, establecerRespuesta] = useState<{ clave: string; consulta: ConsultaReportes }>({
    clave,
    consulta: { estado: 'cargando' },
  })
  const [nombres, establecerNombres] = useState<ReadonlyMap<string, string>>(() => new Map())
  const [accionEnCurso, establecerAccionEnCurso] = useState<{ id: number; accion: AccionModeracion } | null>(null)
  const [decisionesBloqueadas, establecerDecisionesBloqueadas] = useState(false)
  const [mensajeAccion, establecerMensajeAccion] = useState<string | null>(null)
  const [errorAccion, establecerErrorAccion] = useState<string | null>(null)
  const accionActual = useRef<AbortController | null>(null)

  if (respuesta.clave !== clave) {
    establecerRespuesta({ clave, consulta: { estado: 'cargando' } })
  }

  const consulta: ConsultaReportes = rangoInvalido
    ? { estado: 'error', mensaje: 'La fecha desde no puede ser posterior a la fecha hasta.' }
    : respuesta.clave === clave
      ? respuesta.consulta
      : { estado: 'cargando' }

  useEffect(() => {
    if (rangoInvalido) return
    const controlador = new AbortController()
    consultarReportesAdmin(sesion, {
      estado: filtros.estado,
      fechaDesde: filtros.fechaDesde,
      fechaHasta: filtros.fechaHasta,
      pagina: filtros.pagina,
    }, controlador.signal)
      .then((resultado) => {
        if (controlador.signal.aborted) return
        establecerRespuesta({
          clave,
          consulta: {
            estado: 'listo',
            reportes: resultado.reportes,
            paginacion: resultado.paginacion,
            conflictos: resultado.conflictos,
          },
        })
      })
      .catch((error: unknown) => {
        if (!controlador.signal.aborted) {
          establecerRespuesta({
            clave,
            consulta: { estado: 'error', mensaje: mensajeDeError(error, 'No se pudieron cargar los reportes.') },
          })
        }
      })
    return () => controlador.abort()
  }, [sesion, clave, rangoInvalido, filtros.estado, filtros.fechaDesde, filtros.fechaHasta, filtros.pagina])

  useEffect(() => {
    if (respuesta.clave !== clave || respuesta.consulta.estado !== 'listo') return
    const { reportes, conflictos } = respuesta.consulta
    const ids = new Set<string>()
    for (const reporte of reportes) {
      ids.add(reporte.usuarioReportadorId)
      ids.add(reporte.usuarioReportadoId)
      if (reporte.resueltoPorId !== null) ids.add(reporte.resueltoPorId)
      if (reporte.reactivadoPorId !== null) ids.add(reporte.reactivadoPorId)
    }
    for (const conflicto of conflictos) {
      ids.add(conflicto.idTutor)
      ids.add(conflicto.idTutee)
      for (const declaracion of conflicto.declaraciones) {
        ids.add(declaracion.idUsuario)
        if (declaracion.idUsuarioInasistente !== null) ids.add(declaracion.idUsuarioInasistente)
      }
    }
    if (ids.size === 0) return
    const controlador = new AbortController()
    obtenerNombresUsuarios([...ids], sesion.token, controlador.signal)
      .then((mapa) => {
        if (controlador.signal.aborted) return
        establecerNombres((anteriores) => new Map([...anteriores, ...mapa]))
      })
      .catch(() => undefined)
    return () => controlador.abort()
  }, [respuesta, clave, sesion.token])

  useEffect(() => () => {
    accionActual.current?.abort()
    accionActual.current = null
  }, [])

  function actualizarListado() {
    if (accionActual.current) return
    establecerDecisionesBloqueadas(false)
    establecerMensajeAccion(null)
    establecerErrorAccion(null)
    establecerRecarga((valor) => valor + 1)
  }

  function cambiarFiltros(siguiente: CambioFiltros) {
    if (accionActual.current) return
    establecerDecisionesBloqueadas(false)
    establecerMensajeAccion(null)
    establecerErrorAccion(null)
    establecerParametros(parametrosDeFiltros({ ...siguiente, pagina: 1 }))
  }

  function cambiarPagina(pagina: number) {
    if (accionActual.current) return
    establecerMensajeAccion(null)
    establecerErrorAccion(null)
    establecerParametros(parametrosDeFiltros({ ...filtros, pagina }))
  }

  async function ejecutarAccion(
    reporte: Reporte,
    accion: AccionModeracion,
    operacion: (signal: AbortSignal) => Promise<Reporte>,
    mensajeExito: string,
  ) {
    if (accionActual.current || decisionesBloqueadas) return

    const controlador = new AbortController()
    accionActual.current = controlador
    establecerAccionEnCurso({ id: reporte.id, accion })
    establecerMensajeAccion(null)
    establecerErrorAccion(null)

    try {
      const actualizado = await operacion(controlador.signal)
      if (controlador.signal.aborted) return

      establecerRespuesta((anterior) => {
        if (anterior.consulta.estado !== 'listo') return anterior
        const reportes = anterior.consulta.reportes.map((item) => (item.id === actualizado.id ? actualizado : item))
        return {
          clave: anterior.clave,
          consulta: {
            ...anterior.consulta,
            reportes: filtros.estado === undefined
              ? reportes
              : reportes.filter((item) => item.estado === filtros.estado),
          },
        }
      })
      establecerMensajeAccion(mensajeExito)
    } catch (error) {
      if (!controlador.signal.aborted) {
        if (error instanceof ErrorModeracionReporte && error.requiereActualizar) {
          establecerDecisionesBloqueadas(true)
        }
        establecerErrorAccion(
          mensajeDeError(error, 'No pudimos confirmar la operación. Actualiza el listado antes de repetirla.'),
        )
      }
    } finally {
      if (accionActual.current === controlador) {
        accionActual.current = null
        establecerAccionEnCurso(null)
      }
    }
  }

  function resolver(reporte: Reporte, estado: ResolucionReporte, motivo?: string) {
    if (reporte.estado !== 'PENDIENTE') return
    void ejecutarAccion(
      reporte,
      'resolver',
      (signal) => resolverReporte(reporte.id, { estado, motivo }, sesion, signal),
      MENSAJES_RESOLUCION[estado],
    )
  }

  function reactivar(reporte: Reporte) {
    if (reporte.estado !== 'SUSPENDIDO' || reporte.reactivadoEn !== null) return
    void ejecutarAccion(
      reporte,
      'reactivar',
      (signal) => reactivarSuspension(reporte.id, sesion, signal),
      'La cuenta fue reactivada correctamente.',
    )
  }

  return (
    <ReportesAdminPage
      consulta={consulta}
      filtros={filtros}
      nombres={nombres}
      accionEnCurso={accionEnCurso}
      decisionesBloqueadas={decisionesBloqueadas}
      mensajeAccion={mensajeAccion}
      errorAccion={errorAccion}
      onRecargar={actualizarListado}
      onFiltrar={cambiarFiltros}
      onCambiarPagina={cambiarPagina}
      onResolver={resolver}
      onReactivar={reactivar}
    />
  )
}

export default function ReportesAdminContainer() {
  const sesion = useSesionUsuario()
  const autorizado = sesion?.roles.some((rol) => rol === 'ADMIN' || rol === 'ADMINISTRADOR') ?? false
  if (!sesion || !autorizado) return (
    <ReportesAdminPage
      acceso={sesion ? 'permiso' : 'sesion'}
      consulta={{ estado: 'cargando' }}
      filtros={{ pagina: 1 }}
      onRecargar={() => {}}
      onFiltrar={() => {}}
      onCambiarPagina={() => {}}
      onResolver={() => {}}
      onReactivar={() => {}}
    />
  )
  return <ReportesDelAdministrador key={sesion.token} sesion={sesion} />
}
