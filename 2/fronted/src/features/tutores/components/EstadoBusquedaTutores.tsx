import './EstadoBusquedaTutores.css'

type EstadoBusquedaTutoresProps =
  | { estado: 'inicial' | 'vacio' | 'cargando' }
  | { estado: 'error'; mensaje: string; onReintentar?: () => void }
  | { estado: 'pagina-vacia'; onVolver: () => void }

export function EstadoBusquedaTutores(props: EstadoBusquedaTutoresProps) {
  const titulos = {
    inicial: 'Encuentra apoyo para tu próxima materia',
    vacio: 'No encontramos tutores',
    cargando: 'Buscando tutores…',
    error: 'No pudimos cargar los tutores',
    'pagina-vacia': 'No hay tutores en esta página',
  }
  const mensajes = {
    inicial: 'Selecciona una materia para consultar los tutores habilitados.',
    vacio: 'No hay tutores habilitados para esta materia. Puedes buscar otra asignatura.',
    cargando: 'Estamos consultando los tutores habilitados para tu materia.',
    'pagina-vacia': 'Vuelve a la primera página para ver los tutores disponibles.',
  }
  return (
    <div className="estado-busqueda-tutores" role={props.estado === 'error' ? 'alert' : 'status'}>
      <div className="estado-busqueda-tutores__icono">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      </div>
      <h3>{titulos[props.estado]}</h3>
      <p>{props.estado === 'error' ? props.mensaje : mensajes[props.estado]}</p>
      {props.estado === 'error' && props.onReintentar && (
        <button type="button" onClick={props.onReintentar}>Reintentar</button>
      )}
      {props.estado === 'pagina-vacia' && (
        <button type="button" onClick={props.onVolver}>Volver a la primera página</button>
      )}
    </div>
  )
}
