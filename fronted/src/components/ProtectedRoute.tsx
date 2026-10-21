import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  if (!token) {
    window.location.href = '/login';
    return null;
  }

  if (requiredRole && userRole !== requiredRole) {
    return (
      <div style={styles.unauthorizedContainer}>
        <h2>Acceso No Autorizado</h2>
        <p>No tienes los permisos suficientes para acceder a esta sección.</p>
        <a href="/" style={styles.backBtn}>Volver al Inicio</a>
      </div>
    );
  }

  return <>{children}</>;
}

const styles: { [key: string]: React.CSSProperties } = {
  unauthorizedContainer: {
    maxWidth: '480px',
    margin: '80px auto',
    padding: '32px',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    fontFamily: 'sans-serif',
  },
  backBtn: {
    display: 'inline-block',
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
  },
};