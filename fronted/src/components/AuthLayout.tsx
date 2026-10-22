import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PanelComunidad } from '../shared/layout/PanelComunidad'

interface AuthLayoutProps {
  children: ReactNode
  activeTab: 'login' | 'register'
  onTabChange: (tab: 'login' | 'register') => void
}

export default function AuthLayout({ children, activeTab, onTabChange }: AuthLayoutProps) {
  return (
    <main className="acceso-pagina">
      <div className="acceso-columnas">
        <PanelComunidad />
        <section className="acceso-tarjeta" aria-labelledby="acceso-titulo">
          <h1 id="acceso-titulo">{activeTab === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}</h1>
          <p className="acceso-tarjeta__subtitulo">
            {activeTab === 'login' ? 'Ingresa con tu cuenta institucional para continuar.' : 'Regístrate con tu correo institucional.'}
          </p>
          <div className="acceso-pestanas" role="group" aria-label="Acceso a la plataforma">
            <button type="button" aria-pressed={activeTab === 'login'} onClick={() => onTabChange('login')}>Iniciar sesión</button>
            <button type="button" aria-pressed={activeTab === 'register'} onClick={() => onTabChange('register')}>Registrarse</button>
          </div>
          {children}
          <Link to="/verificar-cuenta" className="acceso-enlace-verificacion">¿Ya creaste tu cuenta? Verifica tu correo</Link>
        </section>
      </div>
    </main>
  )
}
