import { useEffect } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { useMaterias } from '../../materias/hooks/useMaterias'
import { SesionesActivas } from '../components/SesionesActivas'
import { useCancelarSesion } from '../hooks/useCancelarSesion'
import { useNombresTutores } from '../hooks/useNombreTutores'
import { useSesionesActivas } from '../hooks/useSesionesActivas'

function SesionesActivasDelEstudiante({ sesion }: { sesion: SesionUsuario }) {
  const { consulta, recargar } = useSesionesActivas(sesion)
  const cancelacion = useCancelarSesion(sesion, consulta, recargar)
  const nombresTutores = useNombresTutores(
    consulta.estado === 'listo' ? consulta.sesiones.map((clase) => clase.id_tutor) : [],
    sesion.token,
  )
  const { consulta: catalogo } = useMaterias()
  const puedeActualizar = (consulta.estado !== 'error' || consulta.tipo === 'consulta') && cancelacion.puedeActualizar
  const actualizar = cancelacion.actualizar

  useEffect(() => {
    if (!puedeActualizar) return
    const temporizador = window.setInterval(() => {
      if (document.visibilityState === 'visible') actualizar()
    }, 60000)
    const alVolver = () => { if (document.visibilityState === 'visible') actualizar() }
    window.addEventListener('focus', alVolver)
    return () => { window.clearInterval(temporizador); window.removeEventListener('focus', alVolver) }
  }, [actualizar, puedeActualizar])

  return <SesionesActivas consulta={consulta} materias={catalogo.estado === 'listo' ? catalogo.materias : []} onRecargar={actualizar} cancelacion={cancelacion} nombresTutores={nombresTutores} />
}

export default function SesionesActivasContainer() {
  const sesion = useSesionUsuario()
  if (!sesion || !sesion.roles.includes('ESTUDIANTE')) return (
    <SesionesActivas acceso={sesion ? 'permiso' : 'sesion'} consulta={{ estado: 'cargando' }} onRecargar={() => {}} />
  )
  return <SesionesActivasDelEstudiante key={sesion.token} sesion={sesion} />
}
