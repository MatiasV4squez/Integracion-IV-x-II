import { useEffect } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { useMaterias } from '../../materias/hooks/useMaterias'
import { SesionesActivas } from '../components/SesionesActivas'
import { useSesionesActivas } from '../hooks/useSesionesActivas'

function SesionesActivasDelEstudiante({ sesion }: { sesion: SesionUsuario }) {
  const { consulta, recargar } = useSesionesActivas(sesion)
  const { consulta: catalogo } = useMaterias()
  const puedeActualizar = consulta.estado !== 'error' || consulta.tipo === 'consulta'

  useEffect(() => {
    if (!puedeActualizar) return
    const temporizador = window.setInterval(() => {
      if (document.visibilityState === 'visible') recargar()
    }, 60000)
    const alVolver = () => { if (document.visibilityState === 'visible') recargar() }
    window.addEventListener('focus', alVolver)
    return () => { window.clearInterval(temporizador); window.removeEventListener('focus', alVolver) }
  }, [recargar, puedeActualizar])

  return <SesionesActivas consulta={consulta} materias={catalogo.estado === 'listo' ? catalogo.materias : []} onRecargar={recargar} />
}

export default function SesionesActivasContainer() {
  const sesion = useSesionUsuario()
  if (!sesion || !sesion.roles.includes('ESTUDIANTE')) return (
    <SesionesActivas acceso={sesion ? 'permiso' : 'sesion'} consulta={{ estado: 'cargando' }} onRecargar={() => {}} />
  )
  return <SesionesActivasDelEstudiante key={sesion.idUsuario} sesion={sesion} />
}
