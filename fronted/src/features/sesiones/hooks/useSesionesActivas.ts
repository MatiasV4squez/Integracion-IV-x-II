import { useCallback, useEffect, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import type { ConsultaSesionesActivas } from '../models/sesion'
import { consultarHistorialEstudiante, ErrorConsultaSesiones } from '../services/sesiones-api'
import { seleccionarSesionesActivas } from '../utils/sesiones-activas'

export function useSesionesActivas(sesion: SesionUsuario) {
  const [intento, setIntento] = useState(0)
  const clave = JSON.stringify([sesion.token, sesion.idUsuario, intento])
  const [respuesta, setRespuesta] = useState<{ clave: string; consulta: ConsultaSesionesActivas }>({ clave, consulta: { estado: 'cargando' } })
  if (respuesta.clave !== clave) setRespuesta({ clave, consulta: { estado: 'cargando' } })

  useEffect(() => {
    const controlador = new AbortController()
    consultarHistorialEstudiante(sesion, controlador.signal)
      .then((sesiones) => {
        if (!controlador.signal.aborted) setRespuesta({ clave, consulta: { estado: 'listo', sesiones } })
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        const mensaje = error instanceof ErrorConsultaSesiones ? error.message : 'No pudimos cargar tus sesiones. Inténtalo de nuevo.'
        const tipo = error instanceof ErrorConsultaSesiones ? error.tipo : 'consulta'
        setRespuesta({ clave, consulta: { estado: 'error', mensaje, tipo } })
      })
    return () => controlador.abort()
  }, [clave, sesion])

  const recargar = useCallback(() => setIntento((actual) => actual + 1), [])
  const consultaHistorial: ConsultaSesionesActivas = respuesta.clave === clave
    ? respuesta.consulta : {estado: 'cargando'}

  const consulta: ConsultaSesionesActivas= consultaHistorial.estado === 'listo'
    ? {
      estado: 'listo',
      sesiones: seleccionarSesionesActivas(
        consultaHistorial.sesiones,
        sesion.idUsuario,
      ),
    }
  : consultaHistorial

  return {
    consulta,
    historial:
      consultaHistorial.estado === 'listo'
        ? consultaHistorial.sesiones
        : [], recargar,
  }
}
