import { useEffect, useRef, useState } from 'react'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import type { ConsultaPostulaciones, Postulacion } from '../models/postulacion'
import PostulacionesAdminPage from '../pages/PostulacionesAdminPage'
import { consultarPostulaciones, obtenerCertificadoPostulacion } from '../services/postulaciones-api'

function PostulacionesDelAdministrador({ sesion }: { sesion: SesionUsuario }) {
  const [consulta, establecerConsulta] = useState<ConsultaPostulaciones>({ estado: 'cargando' })
  const [seleccionada, establecerSeleccionada] = useState<string | null>(null)
  const [recarga, establecerRecarga] = useState(0)
  const [errorCertificado, establecerErrorCertificado] = useState<string | null>(null)
  const [descargando, establecerDescargando] = useState(false)
  const descargaActual = useRef<AbortController | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    consultarPostulaciones(sesion, controlador.signal)
      .then((postulaciones) => {
        if (!controlador.signal.aborted) establecerConsulta({ estado: 'listo', postulaciones })
      })
      .catch((error: unknown) => {
        if (!controlador.signal.aborted) establecerConsulta({
          estado: 'error',
          mensaje: error instanceof Error ? error.message : 'No se pudieron cargar las postulaciones.',
        })
      })
    return () => controlador.abort()
  }, [sesion, recarga])

  useEffect(() => () => {
    descargaActual.current?.abort()
    descargaActual.current = null
  }, [])

  function actualizarListado() {
    establecerConsulta({ estado: 'cargando' })
    establecerSeleccionada(null)
    establecerErrorCertificado(null)
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
      const url = URL.createObjectURL(archivo)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `certificado-${postulacion.idPostulacion}.${archivo.type === 'application/pdf' ? 'pdf' : 'png'}`
      document.body.appendChild(enlace)
      try { enlace.click() }
      finally {
        enlace.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (error) {
      if (!controlador.signal.aborted) establecerErrorCertificado(
        error instanceof Error ? error.message : 'No se pudo descargar el certificado.',
      )
    } finally {
      if (descargaActual.current === controlador) {
        descargaActual.current = null
        establecerDescargando(false)
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
    />
  )
  return <PostulacionesDelAdministrador key={sesion.token} sesion={sesion} />
}
