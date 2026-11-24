import { useEffect, useState } from 'react'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { mensajeDeError } from '../../../shared/utils/mensaje-error'
import { obtenerNombresUsuarios } from '../../tutores/services/nombres-tutores-api'
import type { ConsultaTutoresRevision } from '../models/tutores-revision'
import { ErrorConsultaTutoresRevision, consultarTutoresEnRevision } from '../services/tutores-revision-api'
import TutoresRevisionAdminPage from '../pages/TutoresRevisionAdminPage'

function TutoresRevisionDelAdministrador({ sesion }: { sesion: SesionUsuario }) {
  const [recarga, setRecarga] = useState(0)
  const clave = String(recarga)
  const [respuesta, setRespuesta] = useState<{ clave: string; consulta: ConsultaTutoresRevision }>({ clave, consulta: { estado: 'cargando' } })
  const [nombres, setNombres] = useState<ReadonlyMap<string, string>>(() => new Map())

  if (respuesta.clave !== clave) setRespuesta({ clave, consulta: { estado: 'cargando' } })

  const consulta: ConsultaTutoresRevision = respuesta.clave === clave ? respuesta.consulta : { estado: 'cargando' }

  useEffect(() => {
    const controlador = new AbortController()
    consultarTutoresEnRevision(sesion, controlador.signal)
      .then((tutores) => {
        if (controlador.signal.aborted) return
        setRespuesta({ clave, consulta: { estado: 'listo', tutores } })
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        const tipo = error instanceof ErrorConsultaTutoresRevision ? error.tipo : 'consulta'
        setRespuesta({
          clave,
          consulta: { estado: 'error', mensaje: mensajeDeError(error, 'No pudimos cargar los tutores en revisión.'), tipo },
        })
      })
    return () => controlador.abort()
  }, [sesion, clave])

  useEffect(() => {
    if (respuesta.clave !== clave || respuesta.consulta.estado !== 'listo' || respuesta.consulta.tutores.length === 0) return
    const ids = respuesta.consulta.tutores.map((tutor) => tutor.idTutor)
    const controlador = new AbortController()
    obtenerNombresUsuarios(ids, sesion.token, controlador.signal)
      .then((mapa) => {
        if (controlador.signal.aborted) return
        setNombres((anteriores) => new Map([...anteriores, ...mapa]))
      })
      .catch(() => undefined)
    return () => controlador.abort()
  }, [respuesta, clave, sesion.token])

  function actualizar() {
    setRecarga((valor) => valor + 1)
  }

  return <TutoresRevisionAdminPage consulta={consulta} nombres={nombres} onRecargar={actualizar} />
}

export default function TutoresRevisionAdminContainer() {
  const sesion = useSesionUsuario()
  const autorizado = sesion?.roles.some((rol) => rol === 'ADMIN' || rol === 'ADMINISTRADOR') ?? false
  if (!sesion || !autorizado) return (
    <TutoresRevisionAdminPage
      acceso={sesion ? 'permiso' : 'sesion'}
      consulta={{ estado: 'cargando' }}
      onRecargar={() => {}}
    />
  )
  return <TutoresRevisionDelAdministrador key={sesion.token} sesion={sesion} />
}
