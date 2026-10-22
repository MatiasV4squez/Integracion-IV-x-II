import { lazy, type ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { TutoriasLayout } from './TutoriasLayout'
import { verificacionCuentaHttp } from '../features/verificacion-cuenta/services/verificacion-cuenta-http'

const CatalogoMateriasContainer = lazy(() => import('../features/materias/containers/CatalogoMateriasContainer'))
const BuscarTutoresContainer = lazy(() => import('../features/tutores/containers/BuscarTutoresContainer'))
const SolicitudesRecibidasContainer = lazy(() => import('../features/sesiones/containers/SolicitudesRecibidasContainer'))
const VerificacionCuentaContainer = lazy(() => import('../features/verificacion-cuenta/containers/VerificacionCuentaContainer'))

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
