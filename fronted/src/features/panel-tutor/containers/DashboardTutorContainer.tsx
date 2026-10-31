import { useEffect, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { useDisponibilidad } from '../../disponibilidad/hooks/useDisponibilidad'
import { useMaterias } from '../../materias/hooks/useMaterias'
import { useSolicitudesRecibidas } from '../../sesiones/hooks/useSolicitudesRecibidas'
import type { Sesion } from '../../sesiones/models/sesion'
import { seleccionarProximasSesionesTutor } from '../../sesiones/utils/solicitudes-recibidas'
import DashboardTutorPage from '../pages/DashboardTutorPage'

function DashboardDelTutor({ sesion }: { sesion: SesionUsuario }) {
  // Una sola consulta del historial alimenta las solicitudes y las próximas sesiones.
  const [historial, setHistorial] = useState<Sesion[] | null>(null)
  const solicitudes = useSolicitudesRecibidas(sesion, setHistorial)
  const { consulta: disponibilidad, recargar: recargarDisponibilidad } = useDisponibilidad(sesion)
  const { consulta: catalogo } = useMaterias()
  const [ahora, setAhora] = useState(Date.now)
  const { recargar } = solicitudes

  useEffect(() => {
    const alVolver = () => {
      setAhora(Date.now())
      recargar()
      recargarDisponibilidad()
    }
    window.addEventListener('focus', alVolver)
    return () => window.removeEventListener('focus', alVolver)
  }, [recargar, recargarDisponibilidad])

  function actualizarTodo() {
    setAhora(Date.now())
    recargar()
    recargarDisponibilidad()
  }

  return (
    <DashboardTutorPage
      nombre={sesion.nombre}
      ahora={ahora}
      materias={catalogo.estado === 'listo' ? catalogo.materias : []}
      solicitudes={solicitudes.consulta}
      aceptacion={solicitudes.aceptacion}
      bloqueada={solicitudes.bloqueada}
      actualizando={solicitudes.actualizando}
      errorActualizacion={solicitudes.errorActualizacion}
      proximas={historial && seleccionarProximasSesionesTutor(historial, sesion.idUsuario, ahora)}
      completadas={historial && historial.filter((clase) => clase.estado_sesion === 'COMPLETADA').length}
      disponibilidad={disponibilidad}
      onAceptar={solicitudes.aceptar}
      onActualizar={actualizarTodo}
      onRecargarDisponibilidad={recargarDisponibilidad}
    />
  )
}

export default function DashboardTutorContainer() {
  const sesion = useSesionUsuario()
  // RutaProtegida ya exige el rol TUTOR; esto solo evita renderizar sin sesión.
  if (!sesion) return null
  return <DashboardDelTutor key={sesion.idUsuario} sesion={sesion} />
}
