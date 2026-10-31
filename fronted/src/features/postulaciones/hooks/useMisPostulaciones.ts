import { useCallback, useEffect, useRef, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import type { ConsultaPostulaciones, Postulacion } from '../models/postulacion'
import { consultarMisPostulaciones } from '../services/postulacion-tutor-api'

export function useMisPostulaciones(sesion: SesionUsuario) {
  const [consulta, setConsulta] = useState<ConsultaPostulaciones>({ estado: 'cargando' })
  const [actualizando, setActualizando] = useState(false)
  const [errorActualizacion, setErrorActualizacion] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)
  const hayListado = useRef(false)
  useEffect(() => { hayListado.current = consulta.estado === 'listo' }, [consulta])

  useEffect(() => {
    const controlador = new AbortController()
    consultarMisPostulaciones(sesion, controlador.signal)
      .then((postulaciones) => {
        if (controlador.signal.aborted) return
        setConsulta({ estado: 'listo', postulaciones })
        setErrorActualizacion(null)
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar tus postulaciones.'
        // Un fallo al actualizar conserva el último estado conocido en vez de vaciar el historial.
        if (hayListado.current) setErrorActualizacion(mensaje)
        else setConsulta({ estado: 'error', mensaje })
      })
      .finally(() => {
        if (!controlador.signal.aborted) setActualizando(false)
      })
    return () => controlador.abort()
  }, [sesion, intento])

  const recargar = useCallback(() => {
    if (hayListado.current) setActualizando(true)
    else setConsulta({ estado: 'cargando' })
    setIntento((actual) => actual + 1)
  }, [])

  // La revisión ocurre en otra sesión: al volver a la pestaña se consulta el estado actual.
  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') recargar()
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad)
  }, [recargar])

  // Muestra de inmediato la postulación confirmada por el POST, aunque la recarga posterior falle.
  function incorporar(postulacion: Postulacion) {
    setConsulta((previa) => previa.estado !== 'listo' ? previa : {
      estado: 'listo',
      postulaciones: [postulacion, ...previa.postulaciones.filter((otra) => otra.idPostulacion !== postulacion.idPostulacion)],
    })
  }

  return { consulta, actualizando, errorActualizacion, recargar, incorporar }
}
