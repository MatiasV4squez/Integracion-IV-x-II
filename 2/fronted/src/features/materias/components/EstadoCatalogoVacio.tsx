import './EstadoCatalogoVacio.css'

interface EstadoCatalogoVacioProps {
  sinMaterias: boolean
}

export function EstadoCatalogoVacio({ sinMaterias }: EstadoCatalogoVacioProps) {
  return (
    <div className="catalogo-vacio">
      <div className="catalogo-vacio__icono">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14" />
        </svg>
      </div>
      <h3>{sinMaterias ? 'No hay materias disponibles' : 'No encontramos materias'}</h3>
      <p>
        {sinMaterias
          ? 'Las materias aparecerán aquí cuando estén disponibles.'
          : 'Prueba con otro nombre o código de materia.'}
      </p>
    </div>
  )
}
