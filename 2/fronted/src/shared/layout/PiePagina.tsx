import { Link } from 'react-router'

export function PiePagina() {
  return (
    <footer className="pie-global">
      <div className="pie-global__interior">
        <div>
          <Link to="/" className="pie-global__marca">Tutorías</Link>
          <p>Apoyo académico entre pares.</p>
        </div>
        <nav aria-label="Enlaces del pie de página">
          <Link to="/">Inicio</Link>
          <Link to="/materias">Materias</Link>
          <span aria-disabled="true" title="Sección aún no disponible">Soporte</span>
          <span aria-disabled="true" title="Sección aún no disponible">Privacidad</span>
        </nav>
      </div>
    </footer>
  )
}
