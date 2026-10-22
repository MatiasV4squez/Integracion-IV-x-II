import { lazy } from 'react';
import { BrowserRouter, Route } from 'react-router';
import { AppRoutes } from './app/AppRoutes';
import './App.css';

const PantallasEquipo = lazy(() => import('./components/PantallasEquipo'));
const SeleccionTutoriaView = lazy(() => import('./views/SeleccionTutoriaView').then(({ SeleccionTutoriaView }) => ({ default: SeleccionTutoriaView })));
const AvailabilityScreen = lazy(() => import('./components/AvailabilityScreen').then(({ AvailabilityScreen }) => ({ default: AvailabilityScreen })));

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes>
        <Route
          path="/solicitudes/nueva"
          element={
            <SeleccionTutoriaView
              idMateria="1"
              nombreMateria="Cálculo intermedio"
            />
          }
        />
        <Route path="/disponibilidad" element={<AvailabilityScreen />} />
        <Route path="/registro" element={<PantallasEquipo key="registro" vistaInicial="register" />} />
        <Route path="/*" element={<PantallasEquipo key="login" />} />
      </AppRoutes>
    </BrowserRouter>
  );
}
