import SesionesActivasContainer from '../../sesiones/containers/SesionesActivasContainer'
import PanelTuteePage from '../pages/PanelTuteePage'

export default function PanelTuteeContainer() {
  return <PanelTuteePage sesiones={<SesionesActivasContainer />} />
}
