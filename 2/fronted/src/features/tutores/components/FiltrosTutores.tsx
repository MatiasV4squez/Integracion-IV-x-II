import { useId, useState } from 'react'
import './FiltrosTutores.css'

export function FiltrosTutores() {
  const id = useId()
  const [abierto, establecerAbierto] = useState(false)
  const opciones = [
    { valor: 4.5, etiqueta: '4,5 o más' },
    { valor: 4, etiqueta: '4,0 o más' },
    { valor: 0, etiqueta: 'Todas' },
  ] as const

  return (
    <aside className="filtros-tutores" aria-labelledby={id + '-titulo'}>
      <h2 id={id + '-titulo'}>
        <span className="filtros-tutores__titulo">Filtros</span>
        <button
          className="filtros-tutores__alternar"
          type="button"
          aria-expanded={abierto}
          aria-controls={id + '-contenido'}
          onClick={() => establecerAbierto((actual) => !actual)}
        >
          Filtros <span>{abierto ? 'Ocultar' : 'Mostrar'}</span>
        </button>
      </h2>
      <div id={id + '-contenido'} className={'filtros-tutores__contenido' + (abierto ? ' filtros-tutores__contenido--abierto' : '')}>
        <fieldset disabled aria-describedby={id + '-ayuda'}>
          <legend>Calificación mínima</legend>
          {opciones.map(({ valor, etiqueta }) => (
            <label className="filtros-tutores__opcion" key={valor}>
              <input
                type="radio"
                name={id + '-calificacion'}
                value={valor}
                defaultChecked={valor === 0}
              />
              {valor > 0 && <span className="filtros-tutores__estrella" aria-hidden="true">★</span>}
              <span>{etiqueta}</span>
            </label>
          ))}
        </fieldset>
        <button className="filtros-tutores__limpiar" type="button" disabled>
          Limpiar filtros
        </button>
        <p id={id + '-ayuda'} className="filtros-tutores__ayuda">El filtro por calificación estará disponible próximamente.</p>
      </div>
    </aside>
  )
}
