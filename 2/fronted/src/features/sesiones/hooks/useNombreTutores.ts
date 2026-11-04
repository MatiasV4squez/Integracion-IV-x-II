import { useEffect, useState } from 'react'
import { obtenerNombresUsuarios } from '../../tutores/services/nombres-tutores-api'

export function useNombresTutores(ids: readonly string[], token: string) {
  const clave = [...new Set(ids)].sort().join(',')
  const [nombres, setNombres] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!clave) return
    const controlador = new AbortController()
    obtenerNombresUsuarios(clave.split(','), token, controlador.signal)
      .then(setNombres)
      .catch(() => {})
    return () => controlador.abort()
  }, [clave, token])

  return nombres
}
