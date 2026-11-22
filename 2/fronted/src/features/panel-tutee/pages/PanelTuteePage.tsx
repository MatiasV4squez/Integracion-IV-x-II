import type { ReactNode } from 'react'
import { Link } from 'react-router'
import './PanelTuteePage.css'

interface PanelTuteePageProps {
  sesiones: ReactNode
  historial?: ReactNode
  vista?: 'activas' | 'historial'
  puedeVerActivas?: boolean
  enlaceActivas?: string
  enlaceHistorial?: string
}

export default function PanelTuteePage({ sesiones, historial, vista = 'activas', puedeVerActivas = true,
  enlaceActivas = '/panel', enlaceHistorial = '/panel?vista=historial',
}: PanelTuteePageProps) {
  return (
    <main className="panel-tutee" aria-labelledby="panel-tutee-titulo">
      <div className="panel-tutee__encabezado">
        <h1 id="panel-tutee-titulo">Mi panel</h1>
        <p className="panel-tutee__subtitulo">{vista === 'activas' ? 'Resumen de tu actividad como estudiante.'
          : puedeVerActivas ? 'Revisa tu historial de tutorías y calificaciones.' : 'Revisa tu historial de tutorías y calificaciones como tutor.'} Los horarios se muestran en hora de Chile continental.</p>
      </div>
      {puedeVerActivas && <nav className="panel-tutee__secciones" aria-label="Secciones de Mi panel">
        <Link to={enlaceActivas} aria-current={vista === 'activas' ? 'page' : undefined}>Sesiones activas</Link>
        <Link to={enlaceHistorial} aria-current={vista === 'historial' ? 'page' : undefined}>Historial</Link>
      </nav>}
      {vista === 'historial' ? historial : sesiones}
    </main>
  )
}
