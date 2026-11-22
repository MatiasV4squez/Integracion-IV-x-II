import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import type { UsuarioEncabezado } from './configuracion-navegacion'
import './MenuUsuario.css'

interface Propiedades {
  usuario: UsuarioEncabezado
  alCerrarSesion?: () => void
  selectorRol?: ReactNode
  contadorSolicitudes?: ReactNode
  alNavegar?: () => void
}

export function MenuUsuario({ usuario, alCerrarSesion, selectorRol, contadorSolicitudes, alNavegar }: Propiedades) {
  const menu = useRef<HTMLDetailsElement>(null)
  const [abierto, setAbierto] = useState(false)
  const ubicacion = useLocation()
  const esTutor = usuario.rol === 'Tutor'
  const esEstudiante = usuario.rol === 'Estudiante'

  useEffect(() => {
    if (menu.current) menu.current.open = false
  }, [ubicacion.key, usuario])

  useEffect(() => {
    function cerrarFuera(evento: Event) {
      if (evento.target instanceof Node && !menu.current?.contains(evento.target) && menu.current) {
        menu.current.open = false
      }
    }
    document.addEventListener('pointerdown', cerrarFuera)
    document.addEventListener('focusin', cerrarFuera)
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera)
      document.removeEventListener('focusin', cerrarFuera)
    }
  }, [])

  function cerrar() {
    if (menu.current) menu.current.open = false
    alNavegar?.()
  }

  return (
    <details
      ref={menu}
      className="menu-usuario"
      onToggle={(evento) => setAbierto(evento.currentTarget.open)}
      onKeyDown={(evento) => {
        if (evento.key === 'Escape' && menu.current?.open) {
          evento.preventDefault()
          menu.current.open = false
          menu.current.querySelector('summary')?.focus()
        }
      }}
    >
      <summary className="menu-usuario__activador" aria-label={'Menú de usuario: ' + usuario.etiqueta + ', ' + usuario.rol}>
        <span className="menu-usuario__avatar" aria-hidden="true" />
        <span className="menu-usuario__identidad">
          <strong>{usuario.etiqueta}</strong>
          <span>{usuario.rol}</span>
        </span>
        <svg className="menu-usuario__flecha" width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden="true">
          <path d="m2 3 12 13L26 3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </summary>
      <div className="menu-usuario__desplegable">
        {!(esEstudiante || esTutor) && (
          <div className="menu-usuario__cuerpo">
            <nav className="menu-usuario__enlaces" aria-label="Mi cuenta">
              <Link className="menu-usuario__opcion" to="/perfil" onClick={cerrar}>Mi perfil</Link>
            </nav>
          </div>
        )}
        {(esEstudiante || esTutor) && (
          <div className="menu-usuario__cuerpo">
            <nav className="menu-usuario__enlaces" aria-label="Mi cuenta">
              <Link className="menu-usuario__opcion" to="/perfil" onClick={cerrar}>Mi perfil</Link>
              {esTutor ? (
                <Link className="menu-usuario__opcion" to="/solicitudes/recibidas" onClick={cerrar}>
                  Solicitudes {abierto && contadorSolicitudes}
                </Link>
              ) : (
                <Link className="menu-usuario__opcion" to="/panel" onClick={cerrar}>Mi panel</Link>
              )}
              {(selectorRol || esTutor) && (
                <Link className="menu-usuario__opcion" to="/postulacion-tutor" onClick={cerrar}>Mis postulaciones</Link>
              )}
            </nav>
            <p className="menu-usuario__contexto">Cambiar contexto</p>
            {selectorRol || (esEstudiante ? (
              <Link className="menu-usuario__opcion menu-usuario__opcion--primaria" to="/postulacion-tutor" onClick={cerrar}>Ser tutor</Link>
            ) : <p className="menu-usuario__aviso">Contexto Tutor</p>)}
          </div>
        )}
        {alCerrarSesion && (
          <div className="menu-usuario__pie">
            <button type="button" className="menu-usuario__opcion" onClick={() => { cerrar(); alCerrarSesion() }}>Cerrar sesión</button>
          </div>
        )}
      </div>
    </details>
  )
}
