import { useEffect, useRef, useState } from 'react'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import type { ConsultaPostulaciones, Postulacion } from '../models/postulacion'
import PostulacionesAdminPage from '../pages/PostulacionesAdminPage'
import { consultarPostulaciones, obtenerCertificadoPostulacion } from '../services/postulaciones-api'
import { descargarArchivo } from '../../../shared/utils/descargar-archivo'
import { mensajeDeError } from '../../../shared/utils/mensaje-error'
import { ErrorRevisionPostulacion } from '../models/error-revision-postulacion'
import { aprobarPostulacion, rechazarPostulacion } from '../services/revision-postulaciones-api'

function PostulacionesDelAdministrador({ sesion }: { sesion: SesionUsuario }) {
  const [consulta, establecerConsulta] = useState<ConsultaPostulaciones>({ estado: 'cargando' })
  const [seleccionada, establecerSeleccionada] = useState<string | null>(null)
  const [recarga, establecerRecarga] = useState(0)
  const [errorCertificado, establecerErrorCertificado] = useState<string | null>(null)
  const [descargando, establecerDescargando] = useState(false)
  const descargaActual = useRef<AbortController | null>(null)
  const [revisionEnCurso, establecerRevisionEnCurso] = useState<string | null>(null)
  const [revisionBloqueada, establecerRevisionBloqueada] = useState(false)
  const [mensajeRevision, establecerMensajeRevision] = useState<string | null>(null)
  const [errorRevision, establecerErrorRevision] = useState<string | null>(null)
  const revisionActual = useRef<AbortController | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    consultarPostulaciones(sesion, controlador.signal)
      .then((postulaciones) => {
        if (!controlador.signal.aborted) establecerConsulta({ estado: 'listo', postulaciones })
      })
      .catch((error: unknown) => {
        if (!controlador.signal.aborted) establecerConsulta({
          estado: 'error',
          mensaje: mensajeDeError(error, 'No se pudieron cargar las postulaciones.'),
        })
      })
    return () => controlador.abort()
  }, [sesion, recarga])

  useEffect(() => () => {
    descargaActual.current?.abort()
    revisionActual.current?.abort()
    descargaActual.current = null
    revisionActual.current = null
  }, [])

  function actualizarListado() {
    if (revisionActual.current) return
    establecerConsulta({ estado: 'cargando' })
    establecerSeleccionada(null)
    establecerErrorCertificado(null)
    // Mientras se consulta no se muestran acciones; un fallo mantiene el listado oculto.
    establecerRevisionBloqueada(false)
    establecerMensajeRevision(null)
    establecerErrorRevision(null)
    establecerRecarga((valor) => valor + 1)
  }

  function seleccionarPostulacion(id: string) {
    establecerSeleccionada(id)
    establecerErrorCertificado(null)
  }

  async function descargarCertificado(postulacion: Postulacion) {
    if (descargaActual.current) return
    const controlador = new AbortController()
    descargaActual.current = controlador
    establecerErrorCertificado(null)
    establecerDescargando(true)
    try {
      const archivo = await obtenerCertificadoPostulacion(sesion, postulacion, controlador.signal)
      if (controlador.signal.aborted || sesion.expiraEn <= Date.now()) return
      descargarArchivo(archivo, `certificado-${postulacion.idPostulacion}.${archivo.type === 'application/pdf' ? 'pdf' : 'png'}`)
    } catch (error) {
      if (!controlador.signal.aborted) establecerErrorCertificado(
        mensajeDeError(error, 'No se pudo descargar el certificado.'),
      )
    } finally {
      if (descargaActual.current === controlador) {
        descargaActual.current = null
        establecerDescargando(false)
      }
    }
  }

  async function revisarPostulacion(
    postulacion: Postulacion,
    decision: 'aprobar' | 'rechazar',
    valor: number | string,
  ) {
    if (revisionActual.current || revisionBloqueada || postulacion.estado !== 'PENDIENTE') return

    const controlador = new AbortController()
    revisionActual.current = controlador
    establecerRevisionEnCurso(postulacion.idPostulacion)
    establecerMensajeRevision(null)
    establecerErrorRevision(null)

    try {
      if (decision === 'aprobar') {
        await aprobarPostulacion(postulacion.idPostulacion, valor as number, sesion, controlador.signal)
      } else {
        await rechazarPostulacion(postulacion.idPostulacion, valor as string, sesion, controlador.signal)
      }

      if (controlador.signal.aborted) return

      establecerConsulta((anterior) =>
        anterior.estado === 'listo'
          ? {
              estado: 'listo',
              postulaciones: anterior.postulaciones.filter(
                (item) => item.idPostulacion !== postulacion.idPostulacion,
              ),
            }
          : anterior,
      )

      establecerSeleccionada(null)
      establecerMensajeRevision(
        decision === 'aprobar'
          ? 'Postulación aprobada correctamente.'
          : 'Postulación rechazada correctamente.',
      )
    } catch (error) {
      if (!controlador.signal.aborted) {
        if (error instanceof ErrorRevisionPostulacion && error.requiereActualizar) {
          establecerRevisionBloqueada(true)
        }
        establecerErrorRevision(
          mensajeDeError(error, 'No se pudo confirmar la revisión. Actualiza el listado antes de repetirla.'),
        )
      }
    } finally {
      if (revisionActual.current === controlador) {
        revisionActual.current = null
        establecerRevisionEnCurso(null)
      }
    }
  }

  return (
    <PostulacionesAdminPage
      consulta={consulta}
      seleccionada={seleccionada}
      descargando={descargando}
      errorCertificado={errorCertificado}
      onRecargar={actualizarListado}
      onSeleccionar={seleccionarPostulacion}
      onDescargar={(postulacion) => void descargarCertificado(postulacion)}
      revisionEnCurso={revisionEnCurso}
      revisionBloqueada={revisionBloqueada}
      mensajeRevision={mensajeRevision}
      errorRevision={errorRevision}
      onAprobar={(postulacion, nota) => void revisarPostulacion(postulacion, 'aprobar', nota)}
      onRechazar={(postulacion, motivo) => void revisarPostulacion(postulacion, 'rechazar', motivo)}
    />
  )
}

export default function PostulacionesAdminContainer() {
  const sesion = useSesionUsuario()
  const autorizado = sesion?.roles.some((rol) => rol === 'ADMIN' || rol === 'ADMINISTRADOR') ?? false
  if (!sesion || !autorizado) return (
    <PostulacionesAdminPage
      acceso={sesion ? 'permiso' : 'sesion'}
      consulta={{ estado: 'cargando' }}
      onRecargar={() => {}}
      onSeleccionar={() => {}}
      onDescargar={() => {}}
      onAprobar={() => {}}
      onRechazar={() => {}}
    />
  )
  return <PostulacionesDelAdministrador key={sesion.token} sesion={sesion} />
}
