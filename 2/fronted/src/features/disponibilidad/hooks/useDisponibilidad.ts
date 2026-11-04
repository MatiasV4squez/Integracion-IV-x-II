import { useCallback, useEffect, useRef, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import type { ConsultaDisponibilidad, BloqueDisponibilidad, HorarioDisponibilidad, CambiosDisponibilidad } from '../models/bloque-disponibilidad'
import { consultarBloquesDisponibilidad, crearBloqueDisponibilidad, actualizarBloqueDisponibilidad, eliminarBloqueDisponibilidad } from '../services/disponibilidad-api'

export function useDisponibilidad(sesion: SesionUsuario) {
  const [intento, establecerIntento] = useState(0)
  const [guardando, establecerGuardando] = useState(false)
  const [errorOperacion, establecerErrorOperacion] = useState<string | null>(null)
  const operacionActual = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      operacionActual.current?.abort()
    }
  }, [sesion.token])

  const clave = JSON.stringify([
    sesion.token,
    sesion.idUsuario,
    intento,
  ])

  const [respuesta, establecerRespuesta] = useState<{
    clave: string
    consulta: ConsultaDisponibilidad
  }>({
    clave,
    consulta: { estado: 'cargando' },
  })

  useEffect(() => {
    const controlador = new AbortController()

    consultarBloquesDisponibilidad(sesion, controlador.signal)
      .then((bloques) => {
        if (controlador.signal.aborted) return

        establecerRespuesta({
          clave,
          consulta: {
            estado: 'listo',
            bloques: bloques.filter(
              (bloque) => bloque.estadoBloque !== 'INACTIVO',
            ),
          },
        })
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return

        establecerRespuesta({
          clave,
          consulta: {
            estado: 'error',
            mensaje:
              error instanceof Error
                ? error.message
                : 'No pudimos cargar tu disponibilidad.',
          },
        })
      })

    return () => controlador.abort()
  }, [clave, sesion])

  const recargar = useCallback(() => {
    establecerErrorOperacion(null)
    establecerIntento((actual) => actual + 1)}, [])

  async function ejecutarOperacion(
    accion: (signal: AbortSignal) => Promise<BloqueDisponibilidad>,
  ): Promise<boolean> {
    if (operacionActual.current) return false

    const controlador = new AbortController()
    operacionActual.current = controlador

    establecerGuardando(true)
    establecerErrorOperacion(null)

    try {
      await accion(controlador.signal)

      if (controlador.signal.aborted) return false

      recargar()
      return true
    } catch (error) {
      if (!controlador.signal.aborted) {
        establecerErrorOperacion(
          error instanceof Error
            ? error.message
            : 'No pudimos completar la operación.',
        )
      }

      return false
    } finally {
      if (operacionActual.current === controlador) {
        operacionActual.current = null
        establecerGuardando(false)
      }
    }
  }

  const consulta: ConsultaDisponibilidad =
    respuesta.clave === clave
      ? respuesta.consulta
      : { estado: 'cargando' }

  return {
    consulta,
    recargar,
    guardando,
    errorOperacion,

    crear: (horario: HorarioDisponibilidad) =>
      ejecutarOperacion((signal) =>
        crearBloqueDisponibilidad(sesion, horario, signal),
      ),

    actualizar: (
      idBloque: string,
      cambios: CambiosDisponibilidad,
    ) =>
      ejecutarOperacion((signal) =>
        actualizarBloqueDisponibilidad(
          sesion,
          idBloque,
          cambios,
          signal,
        ),
      ),

    eliminar: (idBloque: string) =>
      ejecutarOperacion((signal) =>
        eliminarBloqueDisponibilidad(sesion, idBloque, signal),
      ),
  }
}
