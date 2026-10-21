import React, { useState } from 'react';
import { BrowserRouter, Route } from 'react-router';
import { AppRoutes } from './app/AppRoutes';
import { SeleccionTutoriaView } from './views/SeleccionTutoriaView';
import './App.css';
import AuthLayout from './components/AuthLayout';
import { AvailabilityScreen } from './components/AvailabilityScreen';
import ProtectedRoute from './components/ProtectedRoute';
import TutorApplicationForm from './components/TutorApplicationForm';

function PantallasEquipo() {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'apply' | 'availability'>('login');

  return (
    <div className="app-container">
      {/* Botones flotantes de cambio rápido de vista */}
      <div style={styles.devBar}>
        <button onClick={() => setCurrentView('login')} style={styles.devBtn}>Vista Auth</button>
        <button onClick={() => setCurrentView('apply')} style={styles.devBtn}>Vista Postulación Tutor</button>
        <button onClick={() => setCurrentView('availability')} style={styles.devBtn}>Vista Disponibilidad (Compañero)</button>
      </div>

      {/* VISTAS DE AUTENTICACIÓN (LOGIN Y REGISTRO) */}
      {(currentView === 'login' || currentView === 'register') && (
        <AuthLayout 
          activeTab={currentView} 
          onTabChange={(tab) => setCurrentView(tab)}
        >
          {currentView === 'login' ? (
            <form onSubmit={(e) => e.preventDefault()} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Correo institucional</label>
                <input 
                  type="email" 
                  placeholder="nombre@alu.uct.cl" 
                  style={styles.input} 
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Contraseña</label>
                <input 
                  type="password" 
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
          ) : (
            <form onSubmit={(e) => e.preventDefault()} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre completo</label>
                <input 
                  type="text" 
                  placeholder="Ej. Camila González" 
                  style={styles.input} 
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Correo institucional</label>
                <input 
                  type="email" 
                  placeholder="nombre@universidad.cl" 
                  style={styles.input} 
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Contraseña</label>
                <input 
                  type="password" 
                  placeholder="Mínimo 8 caracteres" 
                  style={styles.input} 
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirmar contraseña</label>
                <input 
                  type="password" 
                  placeholder="Repite tu contraseña" 
                  style={styles.input} 
                />
              </div>

              <button 
                type="button" 
                style={styles.submitBtn}
                onClick={() => setCurrentView('login')}
              >
                Crear cuenta
              </button>
            </form>
          )}
        </AuthLayout>
      )}

      {/* VISTA 3: POSTULACIÓN A TUTOR */}
      {currentView === 'apply' && (
        <ProtectedRoute>
          <TutorApplicationForm />
        </ProtectedRoute>
      )}

      {/* VISTA 4: DISPONIBILIDAD DE TU COMPAÑERO */}
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
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    fontSize: '13px',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  },
  rememberRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  submitBtn: {
    backgroundColor: '#1D4ED8',
    color: '#FFFFFF',
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '6px',
  },
};

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
        <Route path="/*" element={<PantallasEquipo />} />
      </AppRoutes>
    </BrowserRouter>
  );
}
