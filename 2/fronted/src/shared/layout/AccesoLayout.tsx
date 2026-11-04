import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PanelComunidad } from './PanelComunidad'

interface Propiedades {
  idTitulo: string
  titulo: string
  descripcion: string
  pestanaActiva: 'login' | 'register'
  children: ReactNode
  cargando?: boolean
  anunciarEstado?: boolean
}

export function AccesoLayout({
  idTitulo, titulo, descripcion, pestanaActiva, children, cargando = false,
  anunciarEstado = false,
}: Propiedades) {
  return (
    <main className="acceso-pagina">
      <div className="acceso-columnas">
        <PanelComunidad />
        <section className="acceso-tarjeta" aria-labelledby={idTitulo} aria-busy={cargando}>
          <div role={anunciarEstado ? 'status' : undefined} aria-live={anunciarEstado ? 'polite' : undefined} aria-atomic={anunciarEstado || undefined}>
            {cargando && <span className="acceso-tarjeta__spinner" aria-hidden="true" />}
            <h1 id={idTitulo}>{titulo}</h1>
            <p className="acceso-tarjeta__subtitulo">{descripcion}</p>
          </div>
          <nav className="acceso-pestanas" aria-label="Acceso a la plataforma">
            <Link to="/login" aria-current={pestanaActiva === 'login' ? 'page' : undefined}>Iniciar sesión</Link>
            <Link to="/registro" aria-current={pestanaActiva === 'register' ? 'page' : undefined}>Registrarse</Link>
          </nav>
          {children}
          <Link to="/verificar-cuenta" className="acceso-enlace-verificacion">¿Ya creaste tu cuenta? Verifica tu correo</Link>
        </section>
      </div>
    </main>
  )
}
