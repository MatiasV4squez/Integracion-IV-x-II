import { useEffect, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { useMaterias } from '../../materias/hooks/useMaterias'
import { useSolicitudesRecibidas } from '../hooks/useSolicitudesRecibidas'
import SolicitudesRecibidasPage from '../pages/SolicitudesRecibidasPage'

function SolicitudesDelTutor({ sesion }: { sesion: SesionUsuario }) {
  const { consulta, recargar } = useSolicitudesRecibidas(sesion)
  const { consulta: catalogo } = useMaterias()
  const [ahora, setAhora] = useState(Date.now)
  const puedeActualizar = consulta.estado !== 'error' || consulta.tipo === 'consulta'

  useEffect(() => {
    if (!puedeActualizar) return
    const temporizador = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setAhora(Date.now())
        recargar()
      }
    }, 60000)
    const alVolver = () => { setAhora(Date.now()); recargar() }
    window.addEventListener('focus', alVolver)
    return () => { window.clearInterval(temporizador); window.removeEventListener('focus', alVolver) }
  }, [recargar, puedeActualizar])

  return <SolicitudesRecibidasPage consulta={consulta} materias={catalogo.estado === 'listo' ? catalogo.materias : []} ahora={ahora} onRecargar={recargar} />
}

export default function SolicitudesRecibidasContainer() {
  const sesion = useSesionUsuario()
  if (!sesion || !sesion.roles.includes('TUTOR')) return (
    <SolicitudesRecibidasPage acceso={sesion ? 'permiso' : 'sesion'} consulta={{ estado: 'cargando' }} ahora={0} onRecargar={() => {}} />
  )
  return <SolicitudesDelTutor key={sesion.idUsuario} sesion={sesion} />
}
