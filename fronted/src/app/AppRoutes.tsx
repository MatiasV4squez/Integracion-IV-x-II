import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import CatalogoMateriasContainer from '../features/materias/containers/CatalogoMateriasContainer'
import BuscarTutoresContainer from '../features/tutores/containers/BuscarTutoresContainer'
import SolicitudesRecibidasContainer from '../features/sesiones/containers/SolicitudesRecibidasContainer'
import { TutoriasLayout } from './TutoriasLayout'
import VerificacionCuentaContainer from '../features/verificacion-cuenta/containers/VerificacionCuentaContainer'
import { verificacionCuentaHttp } from '../features/verificacion-cuenta/services/verificacion-cuenta-http'

export function AppRoutes({ children }: { children?: ReactNode }) {
  return (
    <Routes>
      <Route element={<TutoriasLayout />}>
        <Route path="/materias" element={<CatalogoMateriasContainer />} />
        <Route path="/tutores" element={<BuscarTutoresContainer />} />
        <Route path="/solicitudes/recibidas" element={<SolicitudesRecibidasContainer />} />
        <Route path="/verificar-cuenta" element={<VerificacionCuentaContainer api={verificacionCuentaHttp} />} />
        {children}
      </Route>
    </Routes>
  )
}
