import React, { lazy, useState } from 'react';
import { useLocation } from 'react-router';
import { RutaProtegida } from '../shared/auth/RutasAcceso';

const TutorApplicationForm = lazy(() => import('./TutorApplicationForm'));
const AvailabilityScreen = lazy(() => import('./AvailabilityScreen').then(({ AvailabilityScreen }) => ({ default: AvailabilityScreen })));

export default function PantallasEquipo() {
  const [currentView, setCurrentView] = useState<'apply' | 'availability'>('apply');
  const location = useLocation();
  const mostrarVistas = import.meta.env.DEV && new URLSearchParams(location.search).get('vistas') === '1';

  return (
    <div className="app-container">
      {mostrarVistas && <div style={styles.devBar}>
        <button onClick={() => setCurrentView('apply')} style={styles.devBtn}>Vista Postulación Tutor</button>
        <button onClick={() => setCurrentView('availability')} style={styles.devBtn}>Vista Disponibilidad (Compañero)</button>
      </div>}

      {currentView === 'apply' && (
        <RutaProtegida>
          <TutorApplicationForm />
        </RutaProtegida>
      )}

      {currentView === 'availability' && <AvailabilityScreen />}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  devBar: {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    zIndex: 9999,
    display: 'flex',
    gap: '8px',
    backgroundColor: '#0F172A',
    padding: '8px',
    borderRadius: '8px',
  },
  devBtn: {
    backgroundColor: '#334155',
    color: '#FFF',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
};
