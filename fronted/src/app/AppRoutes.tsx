import { lazy, type ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { TutoriasLayout } from './TutoriasLayout'
import { verificacionCuentaHttp } from '../features/verificacion-cuenta/services/verificacion-cuenta-http'

const CatalogoMateriasContainer = lazy(() => import('../features/materias/containers/CatalogoMateriasContainer'))
const BuscarTutoresContainer = lazy(() => import('../features/tutores/containers/BuscarTutoresContainer'))
const SolicitudesRecibidasContainer = lazy(() => import('../features/sesiones/containers/SolicitudesRecibidasContainer'))
const VerificacionCuentaContainer = lazy(() => import('../features/verificacion-cuenta/containers/VerificacionCuentaContainer'))
const PanelTuteeContainer = lazy(() => import('../features/panel-tutee/containers/PanelTuteeContainer'))
const PostulacionesAdminContainer = lazy(() => import('../features/postulaciones/containers/PostulacionesAdminContainer'))
const DashboardEstudianteContainer = lazy(() => import('../features/estudiantes/containers/DashboardEstudianteContainer'))
const SolicitarTutoriaContainer = lazy(() => import('../features/sesiones/containers/SolicitarTutoriaContainer'))
const AvailabilityScreen = lazy(() => import('../components/AvailabilityScreen').then(({ AvailabilityScreen }) => ({ default: AvailabilityScreen })))
const PantallasEquipo = lazy(() => import('../components/PantallasEquipo'))

export function AppRoutes({ children }: { children?: ReactNode }) {
  return (
    <Routes>
      <Route element={<TutoriasLayout />}>
        <Route path="/administracion/postulaciones" element={<PostulacionesAdminContainer />} />
        <Route path="/inicio" element={<DashboardEstudianteContainer />} />
        <Route path="/materias" element={<CatalogoMateriasContainer />} />
        <Route path="/tutores" element={<BuscarTutoresContainer />} />
        <Route path="/solicitudes/recibidas" element={<SolicitudesRecibidasContainer />} />
        <Route path="/panel" element={<PanelTuteeContainer />} />
        <Route path="/verificar-cuenta" element={<VerificacionCuentaContainer api={verificacionCuentaHttp} />} />
        <Route
          path="/solicitudes/nueva"
          element={<SolicitarTutoriaContainer idMateria="1" nombreMateria="Cálculo intermedio" />}
        />
        <Route path="/disponibilidad" element={<AvailabilityScreen />} />
        <Route path="/registro" element={<PantallasEquipo key="registro" vistaInicial="register" />} />
        {children}
        <Route path="/*" element={<PantallasEquipo key="login" />} />
      </Route>
    </Routes>
  )
}
