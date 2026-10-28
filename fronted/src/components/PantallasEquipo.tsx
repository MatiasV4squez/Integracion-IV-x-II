import React, { lazy, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import AuthLayout from './AuthLayout';
import ProtectedRoute from './ProtectedRoute';

const TutorApplicationForm = lazy(() => import('./TutorApplicationForm'));
const AvailabilityScreen = lazy(() => import('./AvailabilityScreen').then(({ AvailabilityScreen }) => ({ default: AvailabilityScreen })));

export default function PantallasEquipo() {
  const [currentView, setCurrentView] = useState<'login' | 'apply' | 'availability'>('login');
  const navigate = useNavigate();
  const location = useLocation();
  const mostrarVistas = import.meta.env.DEV && new URLSearchParams(location.search).get('vistas') === '1';

  return (
    <div className="app-container">
      {mostrarVistas && <div style={styles.devBar}>
        <button onClick={() => setCurrentView('login')} style={styles.devBtn}>Vista Auth</button>
        <button onClick={() => setCurrentView('apply')} style={styles.devBtn}>Vista Postulación Tutor</button>
        <button onClick={() => setCurrentView('availability')} style={styles.devBtn}>Vista Disponibilidad (Compañero)</button>
      </div>}

      {currentView === 'login' && (
        <AuthLayout
          activeTab="login"
          onTabChange={(tab) => {
            navigate(tab === 'register' ? '/registro' : '/login');
          }}
        >
          <form onSubmit={(e) => e.preventDefault()} style={styles.form}>
            <div style={styles.inputGroup}>
              <label htmlFor="login-correo" style={styles.label}>Correo institucional</label>
              <input
                type="email"
                id="login-correo"
                autoComplete="username"
                placeholder="nombre@alu.uct.cl"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label htmlFor="login-password" style={styles.label}>Contraseña</label>
              <input
                type="password"
                id="login-password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                style={styles.input}
              />
            </div>

            <div style={styles.rememberRow}>
              <label style={{ fontSize: '12px', color: '#64748B' }}>
                <input type="checkbox" style={{ marginRight: '6px' }} /> Recordarme
              </label>
              <a href="#forgot" style={{ fontSize: '12px', color: '#1D4ED8', textDecoration: 'none', fontWeight: '600' }}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="button"
              style={styles.submitBtn}
              onClick={() => {
                localStorage.setItem('token', 'fake-jwt-token');
                setCurrentView('apply');
              }}
            >
              Iniciar sesión
            </button>
          </form>
        </AuthLayout>
      )}

      {currentView === 'apply' && (
        <ProtectedRoute>
          <TutorApplicationForm />
        </ProtectedRoute>
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
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#334155' },
  input: {
    padding: '12px 14px',
    minHeight: '50px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    fontSize: '13px',
    backgroundColor: '#FFFFFF',
    color: '#172a48',
  },
  rememberRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  submitBtn: {
    backgroundColor: '#1467d5',
    color: '#FFFFFF',
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '6px',
    minHeight: '50px',
  },
};
