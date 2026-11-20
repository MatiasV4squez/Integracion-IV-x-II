import { useEffect, useState } from 'react'
import { obtenerNombresUsuarios } from '../../tutores/services/nombres-tutores-api'

export function useNombresParticipantes(ids: readonly string[], token: string) {
  const usuarios = [...new Set(ids)].sort().join(',')
  const clave = JSON.stringify([usuarios, token])
  const [respuesta, setRespuesta] = useState<{ clave: string; nombres: Map<string, string> } | null>(null)
  useEffect(() => {
    if (!usuarios) return
    const controlador = new AbortController()
    obtenerNombresUsuarios(usuarios.split(','), token, controlador.signal)
      .then((nombres) => { if (!controlador.signal.aborted) setRespuesta({ clave, nombres }) })
      .catch(() => { if (!controlador.signal.aborted) setRespuesta({ clave, nombres: new Map() }) })
    return () => controlador.abort()
  }, [usuarios, token, clave])
  return respuesta?.clave === clave ? respuesta.nombres : new Map<string, string>()
}
