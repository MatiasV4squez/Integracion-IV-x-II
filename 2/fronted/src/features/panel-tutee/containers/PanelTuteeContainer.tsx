import { useSearchParams } from 'react-router'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import SesionesActivasContainer from '../../sesiones/containers/SesionesActivasContainer'
import HistorialTutoriasContainer from '../../sesiones/containers/HistorialTutoriasContainer'
import { vistaPanel } from '../../sesiones/utils/filtros-tutorias'
import PanelTuteePage from '../pages/PanelTuteePage'

export default function PanelTuteeContainer() {
  const sesion = useSesionUsuario()
  const [parametros] = useSearchParams()
  if (!sesion) return null
  const historial = new URLSearchParams(parametros)
  historial.set('vista', 'historial')
  const activas = new URLSearchParams(parametros)
  activas.set('vista', 'activas')
  return <PanelTuteePage sesiones={<SesionesActivasContainer />} historial={<HistorialTutoriasContainer />}
    vista={vistaPanel(parametros, sesion.roles)} puedeVerActivas={sesion.roles.includes('ESTUDIANTE')}
    enlaceActivas={'/panel?' + activas} enlaceHistorial={'/panel?' + historial} />
}
