import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './components/AuthLayout';
import ProtectedRoute from './components/ProtectedRoute';
import TutorApplicationForm from './components/TutorApplicationForm'; // Importar el componente nuevo

// Panel del Estudiante actualizado
function StudentDashboard() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🎓 Panel del Estudiante</h1>
      <p>Bienvenido. Desde aquí puedes buscar tutorías o postular para convertirte en tutor.</p>
      
      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        <a 
          href="/postular" 
          style={{ padding: '10px 18px', backgroundColor: '#2563EB', color: '#FFF', textDecoration: 'none', borderRadius: '8px', fontWeight: '500' }}
        >
          Postular como Tutor
        </a>
        <button 
          onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          style={{ padding: '10px 18px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #CBD5E1' }}
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<AuthLayout />} />

        {/* Rutas protegidas para Estudiantes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/estudiante" element={<StudentDashboard />} />
          <Route path="/postular" element={<TutorApplicationForm />} /> {/* Nueva ruta */}
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}