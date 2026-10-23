import type { ReactNode } from 'react'
import './PanelTuteePage.css'

interface PanelTuteePageProps {
  sesiones: ReactNode
}

export default function PanelTuteePage({ sesiones }: PanelTuteePageProps) {
  return (
    <main className="panel-tutee" aria-labelledby="panel-tutee-titulo">
      <div className="panel-tutee__encabezado">
        <h1 id="panel-tutee-titulo">Mi panel</h1>
        <p className="panel-tutee__subtitulo">Resumen de tu actividad como estudiante. Los horarios se muestran en hora de Chile continental.</p>
      </div>
      {sesiones}
    </main>
  )
}
