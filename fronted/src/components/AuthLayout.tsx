import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  activeTab: 'login' | 'register';
  onTabChange: (tab: 'login' | 'register') => void;
}

export default function AuthLayout({ children, activeTab, onTabChange }: AuthLayoutProps) {
  return (
    <div style={styles.pageWrapper}>
      {/* HEADER SUPERIOR */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <span style={styles.logoIcon}>🦉</span>
          <span style={styles.logoText}>Tutorías</span>
        </div>
        <nav style={styles.topNav}>
          <a href="#inicio" style={styles.navLink}>Inicio</a>
          <a href="#buscar" style={styles.navLink}>Buscar tutores</a>
          <a href="#materias" style={styles.navLink}>Materias</a>
        </nav>
        <div style={styles.authTopBtns}>
          <button 
            onClick={() => onTabChange('login')} 
            style={activeTab === 'login' ? styles.topBtnActiveText : styles.topBtnText}
          >
            Iniciar sesión
          </button>
          <button 
            onClick={() => onTabChange('register')} 
            style={styles.topBtnPrimary}
          >
            Registrarse
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL EN 2 COLUMNAS */}
      <main style={styles.mainContent}>
        {/* COLUMNA IZQUIERDA: TARJETA AZUL */}
        <div style={styles.heroCard}>
          <span style={styles.heroBadge}>COMUNIDAD UNIVERSITARIA</span>
          <h1 style={styles.heroTitle}>Aprender juntos comienza aquí</h1>
          <p style={styles.heroSubtitle}>
            Conecta con estudiantes verificados, agenda tutorías y fortalece tus materias desde una sola plataforma.
          </p>

          {/* ILUSTRACIÓN / GRÁFICO */}
          <div style={styles.illustrationBox}>
            <div style={styles.circleOrange}></div>
            <div style={styles.circleWhite}></div>
            <div style={styles.rectWhite}></div>
            <div style={styles.baseBar}></div>
          </div>

          <ul style={styles.featureList}>
            <li>✓ Acceso con correo institucional</li>
            <li>✓ Tutores y reputaciones verificables</li>
            <li>✓ Tus solicitudes y horarios en un solo lugar</li>
          </ul>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO */}
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>
            {activeTab === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
          </h2>
          <p style={styles.formSubtitle}>
            {activeTab === 'login' 
              ? 'Ingresa con tu cuenta institucional para continuar.' 
              : 'Regístrate con tu correo institucional.'}
          </p>

          {/* SELECTOR DE PESTAÑAS (INICIAR SESIÓN / REGISTRARSE) */}
          <div style={styles.tabContainer}>
            <button
              onClick={() => onTabChange('login')}
              style={activeTab === 'login' ? styles.tabActive : styles.tabInactive}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => onTabChange('register')}
              style={activeTab === 'register' ? styles.tabActive : styles.tabInactive}
            >
              Registrarse
            </button>
          </div>

          {/* INYECCIÓN DEL FORMULARIO */}
          {children}
        </div>
      </main>

      {/* FOOTER INFERIOR */}
      <footer style={styles.footer}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Tutorías</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.8 }}>Apoyo académico entre pares.</p>
        </div>
        <div style={styles.footerNav}>
          <a href="#inicio" style={styles.footerLink}>Inicio</a>
          <a href="#materias" style={styles.footerLink}>Materias</a>
          <a href="#soporte" style={styles.footerLink}>Soporte</a>
          <a href="#privacidad" style={styles.footerLink}>Privacidad</a>
        </div>
      </footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  pageWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#F0F4F9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 48px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
  logoIcon: { fontSize: '24px' },
  logoText: { fontSize: '20px', fontWeight: '800', color: '#1D4ED8' },
  topNav: { display: 'flex', gap: '24px' },
  navLink: { color: '#475569', textDecoration: 'none', fontSize: '14px', fontWeight: '500' },
  authTopBtns: { display: 'flex', alignItems: 'center', gap: '12px' },
  topBtnText: { backgroundColor: 'transparent', border: 'none', color: '#334155', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
  topBtnActiveText: { backgroundColor: 'transparent', border: 'none', color: '#1D4ED8', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
  topBtnPrimary: { backgroundColor: '#1D4ED8', color: '#FFF', border: 'none', padding: '8px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
  mainContent: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '32px',
    padding: '40px 24px',
    maxWidth: '1100px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  heroCard: {
    flex: 1,
    backgroundColor: '#1D4ED8',
    borderRadius: '24px',
    padding: '40px',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '480px',
    boxShadow: '0 10px 25px -5px rgba(29, 78, 216, 0.3)',
  },
  heroBadge: { fontSize: '11px', fontWeight: '700', letterSpacing: '0.8px', opacity: 0.8 },
  heroTitle: { fontSize: '28px', fontWeight: '800', lineHeight: '1.2', margin: '12px 0' },
  heroSubtitle: { fontSize: '14px', opacity: 0.9, lineHeight: '1.5', margin: 0 },
  illustrationBox: {
    height: '160px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    margin: '24px 0',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOrange: { width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F97316', position: 'absolute', left: '20%' },
  circleWhite: { width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#FFFFFF', position: 'absolute', right: '22%' },
  rectWhite: { width: '60px', height: '40px', backgroundColor: '#FFFFFF', borderRadius: '6px', position: 'absolute', bottom: '30px' },
  baseBar: { width: '160px', height: '12px', backgroundColor: '#1E40AF', borderRadius: '6px', position: 'absolute', bottom: '20px' },
  featureList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', opacity: 0.95 },
  formCard: {
    width: '420px',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '36px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
  },
  formTitle: { fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: '0 0 6px 0' },
  formSubtitle: { fontSize: '13px', color: '#64748B', margin: '0 0 20px 0' },
  tabContainer: { display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '10px', padding: '4px', marginBottom: '20px' },
  tabActive: { flex: 1, backgroundColor: '#1D4ED8', color: '#FFFFFF', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' },
  tabInactive: { flex: 1, backgroundColor: 'transparent', color: '#64748B', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: '500', fontSize: '13px', cursor: 'pointer' },
  footer: {
    backgroundColor: '#1E40AF',
    color: '#FFFFFF',
    padding: '24px 48px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerNav: { display: 'flex', gap: '20px' },
  footerLink: { color: '#E0E7FF', textDecoration: 'none', fontSize: '13px' },
};