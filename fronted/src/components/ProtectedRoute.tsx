import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');

  // 1. Si no hay token, redirigir al Login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Si la ruta requiere roles específicos, validamos el rol
  if (allowedRoles && allowedRoles.length > 0) {
    let userRole = '';
    if (userString) {
      try {
        const user = JSON.parse(userString);
        userRole = user.role || user.rol || '';
      } catch (e) {
        console.error('Error al leer el usuario:', e);
      }
    }

    if (!allowedRoles.includes(userRole)) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>⛔ Acceso Restringido</h2>
          <p>No tienes los permisos necesarios para acceder a esta sección.</p>
          <a href="/login" style={{ color: '#2563EB' }}>Volver al login</a>
        </div>
      );
    }
  }

  // 3. Si todo está en orden, dar paso a la ruta
  return <Outlet />;
}