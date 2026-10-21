import { useEffect, useState } from 'react'
import type { ConsultaTutores } from '../models/consulta-tutores'
import { buscarTutores, ErrorConsultaTutores } from '../services/tutores-api'

export function useBuscarTutores(materiaId: string, page: number) {
  const [intento, setIntento] = useState(0)
  const clave = JSON.stringify([materiaId, page, intento])
  const [respuesta, setRespuesta] = useState<{ clave: string; consulta: ConsultaTutores }>({
    clave, consulta: { estado: materiaId ? 'cargando' : 'inicial' },
  })

  // Reiniciar al cambiar la consulta evita mostrar resultados de otra materia o página.
  if (respuesta.clave !== clave) {
    setRespuesta({ clave, consulta: { estado: materiaId ? 'cargando' : 'inicial' } })
  }

  useEffect(() => {
    if (!materiaId) return
    const controlador = new AbortController()

    buscarTutores({ materiaId, page, signal: controlador.signal })
      .then((resultado) => {
        if (!controlador.signal.aborted) setRespuesta({ clave, consulta: { estado: 'listo', resultado } })
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        const mensaje = error instanceof ErrorConsultaTutores
          ? error.message : 'No pudimos cargar los tutores. Inténtalo de nuevo.'
        setRespuesta({ clave, consulta: { estado: 'error', mensaje } })
      })

    return () => controlador.abort()
  }, [materiaId, page, clave])

  const consulta: ConsultaTutores = !materiaId ? { estado: 'inicial' }
    : respuesta.clave === clave ? respuesta.consulta : { estado: 'cargando' }

  return { consulta, recargar: () => setIntento((actual) => actual + 1) }
}
