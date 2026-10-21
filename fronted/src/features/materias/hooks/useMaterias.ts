import { useEffect, useState } from 'react'
import type { Materia } from '../models/materia'
import { ErrorConsultaMaterias, obtenerMaterias } from '../services/materias-api'

type ConsultaMaterias =
  | { estado: 'cargando' }
  | { estado: 'listo'; materias: Materia[] }
  | { estado: 'error'; mensaje: string }

export function useMaterias() {
  const [consulta, setConsulta] = useState<ConsultaMaterias>({ estado: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()

    obtenerMaterias({ signal: controlador.signal, forzarRecarga: intento > 0 })
      .then((materias) => {
        if (!controlador.signal.aborted) setConsulta({ estado: 'listo', materias })
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        const mensaje = error instanceof ErrorConsultaMaterias
          ? error.message
          : 'No pudimos cargar las materias. Inténtalo de nuevo.'
        setConsulta({ estado: 'error', mensaje })
      })

    return () => controlador.abort()
  }, [intento])

  function recargar() {
    setConsulta({ estado: 'cargando' })
    setIntento((actual) => actual + 1)
  }

  return { consulta, recargar }
}
