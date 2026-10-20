import React, { useState } from 'react';

const API_URL = 'http://localhost:3000'; // Dirección de tu backend NestJS / Django

export default function AuthLayout() {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Formulario de Iniciar Sesión
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Formulario de Registro
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);

  // Manejador del Login con JWT y Gestión de Estado
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Credenciales inválidas');
      }

      // 1. Obtener y guardar el token JWT
      const token = data.access_token || data.token;
      if (token) {
        localStorage.setItem('token', token);
        
        // 2. Guardar estado del usuario y rol si viene desde el backend
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        alert('¡Inicio de sesión exitoso!');
        
        // 3. Recargar la app para sincronizar el estado global
        window.location.reload();
      } else {
        throw new Error('No se recibió un token JWT válido.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Manejador del Registro
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Debes aceptar los términos y condiciones.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: regFullName,
          email: regEmail,
          password: regPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar la cuenta');
      }

      alert('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
      setIsLogin(true); // Cambia al tab de Login
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al intentar registrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Header / Navbar */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <div style={styles.owlIcon}>🦉</div>
          <span style={styles.logoText}>Tutorías</span>
        </div>
        <nav style={styles.navLinks}>
          <a href="#inicio" style={{ ...styles.navLink, ...styles.navLinkActive }}>Inicio</a>
          <a href="#buscar" style={styles.navLink}>Buscar tutores</a>
          <a href="#materias" style={styles.navLink}>Materias</a>
        </nav>
        <div style={styles.headerButtons}>
          <button 
            style={{ ...styles.headerBtn, ...(!isLogin ? styles.headerBtnInactive : {}) }}
            onClick={() => { setIsLogin(true); setErrorMessage(''); }}
          >
            Iniciar sesión
          </button>
          <button 
            style={{ ...styles.headerBtn, ...(isLogin ? styles.headerBtnPrimary : styles.headerBtnActivePill) }}
            onClick={() => { setIsLogin(false); setErrorMessage(''); }}
          >
            Registrarse
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <div style={styles.cardContainer}>
          {/* Tarjeta Izquierda (Banner Informativo) */}
          <div style={styles.leftBanner}>
            <span style={styles.badgeText}>COMUNIDAD UNIVERSITARIA</span>
            <h1 style={styles.bannerTitle}>Aprender juntos comienza aquí</h1>
            <p style={styles.bannerSubtitle}>
              Conecta con estudiantes verificados, agenda tutorías y fortalece tus materias desde una sola plataforma.
            </p>

            <div style={styles.illustrationBox}>
              <svg width="100%" height="160" viewBox="0 0 320 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="320" height="160" rx="16" fill="#60A5FA" fillOpacity="0.4" />
                <circle cx="95" cy="65" r="30" fill="#F97316" />
                <circle cx="195" cy="60" r="35" fill="#FFFFFF" />
                <rect x="70" y="105" width="180" height="10" fill="#1E40AF" rx="6" />
                <rect x="105" y="85" width="70" height="25" fill="#FFFFFF" rx="4" />
              </svg>
            </div>

            <div style={styles.featureList}>
              <div style={styles.featureItem}><span style={styles.checkIcon}>✓</span> Acceso con correo institucional</div>
              <div style={styles.featureItem}><span style={styles.checkIcon}>✓</span> Tutores y reputaciones verificables</div>
              <div style={styles.featureItem}><span style={styles.checkIcon}>✓</span> Tus solicitudes y horarios en un solo lugar</div>
            </div>
          </div>

          {/* Tarjeta Derecha (Formulario) */}
          <div style={styles.rightFormCard}>
            <h2 style={styles.formTitle}>
              {isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
            </h2>
            <p style={styles.formSubtitle}>
              {isLogin ? 'Ingresa con tu cuenta institucional para continuar.' : 'Regístrate con tu correo institucional.'}
            </p>

            {/* Banner de Errores */}
            {errorMessage && (
              <div style={styles.errorBox}>
                {errorMessage}
              </div>
            )}

            {/* Selector Tab */}
            <div style={styles.tabSwitcher}>
              <button 
                type="button"
                style={{ ...styles.tabBtn, ...(isLogin ? styles.tabBtnActive : {}) }}
                onClick={() => { setIsLogin(true); setErrorMessage(''); }}
              >
                Iniciar sesión
              </button>
              <button 
                type="button"
                style={{ ...styles.tabBtn, ...(!isLogin ? styles.tabBtnActive : {}) }}
                onClick={() => { setIsLogin(false); setErrorMessage(''); }}
              >
                Registrarse
              </button>
            </div>

            {/* Formulario Login / Registro */}
            {isLogin ? (
              <form onSubmit={handleLoginSubmit} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Correo institucional</label>
                  <input 
                    type="email"
                    placeholder="nombre@alu.uct.cl"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Contraseña</label>
                  <input 
                    type="password"
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.formOptions}>
                  <label style={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={styles.checkbox}
                    />
                    Recordarme
                  </label>
                  <a href="#forgot" style={styles.forgotLink}>¿Olvidaste tu contraseña?</a>
                </div>

                <button type="submit" disabled={loading} style={styles.submitBtn}>
                  {loading ? 'Cargando...' : 'Iniciar sesión'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nombre completo</label>
                  <input 
                    type="text"
                    placeholder="Ej. Camila González"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Correo institucional</label>
                  <input 
                    type="email"
                    placeholder="nombre@alu.uct.cl"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Contraseña</label>
                  <input 
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Confirmar contraseña</label>
                  <input 
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.formOptions}>
                  <label style={styles.checkboxLabel}>
                    <input 
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      required
                      style={styles.checkbox}
                    />
                    <span style={{ fontSize: '12px' }}>Acepto los términos y la política de privacidad.</span>
                  </label>
                </div>

                <button type="submit" disabled={loading} style={styles.submitBtn}>
                  {loading ? 'Cargando...' : 'Crear cuenta'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div>
            <div style={styles.footerLogo}>
              <span style={styles.owlIcon}>🦉</span>
              <span style={styles.logoText}>Tutorías</span>
            </div>
            <p style={styles.footerSub}>Apoyo académico entre pares.</p>
          </div>
          <div style={styles.footerNav}>
            <a href="#inicio" style={styles.footerLink}>Inicio</a>
            <a href="#materias" style={styles.footerLink}>Materias</a>
            <a href="#soporte" style={styles.footerLink}>Soporte</a>
            <a href="#privacidad" style={styles.footerLink}>Privacidad</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: '#F3F6FC',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    color: '#1E293B',
    margin: 0,
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 40px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0'
  },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
  owlIcon: { fontSize: '22px' },
  logoText: { fontWeight: '700', fontSize: '20px', color: '#1D4ED8' },
  navLinks: { display: 'flex', gap: '24px' },
  navLink: { textDecoration: 'none', color: '#64748B', fontSize: '14px', fontWeight: '500' },
  navLinkActive: { color: '#1D4ED8', fontWeight: '600' },
  headerButtons: { display: 'flex', gap: '12px' },
  headerBtn: { padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  headerBtnInactive: { backgroundColor: 'transparent', color: '#475569' },
  headerBtnPrimary: { backgroundColor: '#2563EB', color: '#FFFFFF' },
  headerBtnActivePill: { backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: '8px' },
  mainContent: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' },
  cardContainer: { display: 'flex', maxWidth: '960px', width: '100%', gap: '32px', alignItems: 'stretch' },
  leftBanner: { flex: 1, backgroundColor: '#1D4ED8', borderRadius: '24px', padding: '36px', color: '#FFFFFF', display: 'flex', flexDirection: 'column' },
  badgeText: { fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#93C5FD', marginBottom: '12px' },
  bannerTitle: { fontSize: '28px', fontWeight: '800', lineHeight: '1.2', marginBottom: '12px' },
  bannerSubtitle: { fontSize: '14px', color: '#DBEAFE', lineHeight: '1.5', marginBottom: '24px' },
  illustrationBox: { marginBottom: '24px', borderRadius: '16px', overflow: 'hidden' },
  featureList: { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  featureItem: { fontSize: '13px', color: '#EFF6FF', display: 'flex', alignItems: 'center', gap: '8px' },
  checkIcon: { fontWeight: 'bold', color: '#60A5FA' },
  rightFormCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '36px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column' },
  formTitle: { fontSize: '24px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' },
  formSubtitle: { fontSize: '13px', color: '#64748B', marginBottom: '20px' },
  errorBox: { backgroundColor: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid #FCA5A5' },
  tabSwitcher: { display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '10px', padding: '4px', marginBottom: '20px' },
  tabBtn: { flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px', backgroundColor: 'transparent', color: '#64748B', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  tabBtnActive: { backgroundColor: '#2563EB', color: '#FFFFFF' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#334155' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' },
  formOptions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' },
  checkbox: { cursor: 'pointer' },
  forgotLink: { fontSize: '12px', color: '#2563EB', textDecoration: 'none', fontWeight: '500' },
  submitBtn: { backgroundColor: '#2563EB', color: '#FFFFFF', padding: '12px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '6px' },
  footer: { backgroundColor: '#0F46BD', color: '#FFFFFF', padding: '24px 40px' },
  footerContent: { maxWidth: '960px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  footerLogo: { display: 'flex', alignItems: 'center', gap: '8px' },
  footerSub: { fontSize: '12px', color: '#93C5FD', marginTop: '4px' },
  footerNav: { display: 'flex', gap: '20px' },
  footerLink: { color: '#FFFFFF', textDecoration: 'none', fontSize: '13px' }
};