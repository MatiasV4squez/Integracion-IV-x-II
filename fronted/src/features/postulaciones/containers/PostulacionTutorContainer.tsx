import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { useMaterias } from '../../materias/hooks/useMaterias'
import { useMisPostulaciones } from '../hooks/useMisPostulaciones'
import type { EstadoEnvioPostulacion } from '../models/postulacion-tutor'
import PostulacionTutorPage from '../pages/PostulacionTutorPage'
import { enviarPostulacionTutor } from '../services/postulacion-tutor-api'

function PostulacionDelUsuario({ sesion }: { sesion: SesionUsuario }) {
  const { consulta: materias, recargar: recargarMaterias } = useMaterias()
  const { consulta: historial, recargar: recargarHistorial } = useMisPostulaciones(sesion)
  const [envio, setEnvio] = useState<EstadoEnvioPostulacion>({ estado: 'inactivo' })
  const [versionFormulario, setVersionFormulario] = useState(0)
  const peticion = useRef<AbortController | null>(null)
  useEffect(() => () => peticion.current?.abort(), [])

  async function enviar(idMateria: string, certificado: File) {
    if (peticion.current) return
    const control = new AbortController()
    peticion.current = control
    setEnvio({ estado: 'enviando' })
    try {
      const postulacion = await enviarPostulacionTutor(sesion, { idMateria, certificado }, control.signal)
      if (control.signal.aborted) return
      setEnvio({ estado: 'exitoso', postulacion })
      setVersionFormulario((actual) => actual + 1)
      recargarHistorial()
    } catch (error) {
      if (control.signal.aborted) return
      setEnvio({ estado: 'error', mensaje: error instanceof Error ? error.message : 'No se pudo enviar la postulación.' })
    } finally {
      if (peticion.current === control) peticion.current = null
    }
  }

  return (
    <PostulacionTutorPage
      materias={materias}
      historial={historial}
      envio={envio}
      versionFormulario={versionFormulario}
      onRecargarMaterias={recargarMaterias}
      onRecargarHistorial={recargarHistorial}
      onEnviar={(idMateria, certificado) => { void enviar(idMateria, certificado) }}
    />
  )
}

export default function PostulacionTutorContainer() {
  const sesion = useSesionUsuario()
  if (!sesion) return <Navigate to="/login" replace />
  return <PostulacionDelUsuario key={sesion.idUsuario} sesion={sesion} />
}
