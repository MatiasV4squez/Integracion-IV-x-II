import { useEffect, useState } from 'react'
import { esIdentificador } from '../../../shared/utils/identificadores'
import type { ConsultaPerfilTutor } from '../models/consulta-perfil-tutor'
import { obtenerTutores } from '../services/disponibilidad-tutores-api'
import { completarNombresTutores } from '../services/nombres-tutores-api'
import { ErrorConsultaTutores } from '../services/tutores-api'

export function usePerfilTutor(idTutor: string, materiaId: string, token?: string) {
  const [intento, setIntento] = useState(0)
  const valido = esIdentificador(idTutor) && esIdentificador(materiaId)
  const clave = JSON.stringify([idTutor, materiaId, intento])
  const [respuesta, setRespuesta] = useState<{ clave: string; consulta: ConsultaPerfilTutor }>({
    clave, consulta: { estado: valido ? 'cargando' : 'invalido' },
  })

  if (respuesta.clave !== clave) {
    setRespuesta({ clave, consulta: { estado: valido ? 'cargando' : 'invalido' } })
  }

  useEffect(() => {
    if (!valido) return
    const controlador = new AbortController()

    obtenerTutores(materiaId, controlador.signal, token)
      .then((tutores) => completarNombresTutores(tutores.filter((item) => item.idTutor === idTutor), token, controlador.signal))
      .then(([tutor]) => {
        if (controlador.signal.aborted) return
        setRespuesta({ clave, consulta: tutor ? { estado: 'listo', tutor } : { estado: 'no-encontrado' } })
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        const mensaje = error instanceof ErrorConsultaTutores
          ? error.message : 'No pudimos cargar el perfil del tutor. Inténtalo de nuevo.'
        setRespuesta({ clave, consulta: { estado: 'error', mensaje } })
      })

    return () => controlador.abort()
  }, [idTutor, materiaId, valido, clave, token])

  const consulta: ConsultaPerfilTutor = !valido ? { estado: 'invalido' }
    : respuesta.clave === clave ? respuesta.consulta : { estado: 'cargando' }

  return { consulta, recargar: () => setIntento((actual) => actual + 1) }
}
