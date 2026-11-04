import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useConsultaSesiones } from '../hooks/useConsultaSesiones'
import { consultarHistorialTutor } from '../services/sesiones-api'
import { seleccionarSolicitudesRecibidas } from '../utils/solicitudes-recibidas'

export function ContadorSolicitudes({ sesion }: { sesion: SesionUsuario }) {
  const { consulta } = useConsultaSesiones(sesion, consultarHistorialTutor)
  if (consulta.estado === 'cargando') return <span aria-label="Consultando solicitudes pendientes">…</span>
  if (consulta.estado === 'error') return <span className="menu-usuario__contador menu-usuario__contador--error" aria-label="No se pudo consultar el número de solicitudes pendientes" title="No se pudo consultar el número de solicitudes pendientes">?</span>
  const cantidad = seleccionarSolicitudesRecibidas(consulta.sesiones, sesion.idUsuario).length
  return <span className="menu-usuario__contador" aria-label={cantidad + ' solicitudes pendientes'}>{cantidad}</span>
}
