import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import type { EnlaceNavegacion, UsuarioEncabezado } from './configuracion-navegacion'

interface Propiedades {
  enlaces: readonly EnlaceNavegacion[]
  usuario?: UsuarioEncabezado
}

export function Encabezado({ enlaces, usuario }: Propiedades) {
  const [abierto, setAbierto] = useState(false)
  const cerrarMenu = () => setAbierto(false)

  return (
    <header className="encabezado-global">
      <div className="encabezado-global__interior">
        <Link to="/" className="marca-tutorias" onClick={cerrarMenu} aria-label="Tutorías, inicio">
          <img src="/buho.svg" width="38" height="38" alt="" />
          <span>Tutorías</span>
        </Link>

        <button
          className="encabezado-global__menu"
          type="button"
          aria-expanded={abierto}
          aria-controls="navegacion-global"
          aria-label={abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
          onClick={() => setAbierto((actual) => !actual)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {abierto ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>

        <div id="navegacion-global" className={'encabezado-global__contenido' + (abierto ? ' encabezado-global__contenido--abierto' : '')}>
          <nav className="navegacion-global" aria-label="Navegación principal">
            {enlaces.map(({ etiqueta, destino }) => (
              <NavLink key={destino} to={destino} end={destino === '/'} onClick={cerrarMenu}>
                {etiqueta}
              </NavLink>
            ))}
          </nav>
          {usuario ? (
            <div className="usuario-global" aria-label={'Sesión de ' + usuario.etiqueta}>
              <span className="usuario-global__avatar" aria-hidden="true">{usuario.rol.charAt(0)}</span>
              <div><strong>{usuario.etiqueta}</strong><span>{usuario.rol}</span></div>
            </div>
          ) : (
            <div className="encabezado-global__acceso">
              <NavLink to="/login" onClick={cerrarMenu}>Iniciar sesión</NavLink>
              <NavLink to="/registro" className="boton-global boton-global--primario" onClick={cerrarMenu}>Registrarse</NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
