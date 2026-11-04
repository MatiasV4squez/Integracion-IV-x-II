import { useId } from 'react'
import type { FormEvent } from 'react'
import './BuscadorMaterias.css'

interface BuscadorMateriasProps {
  busqueda: string
  onBusquedaChange: (busqueda: string) => void
  onBuscar: () => void
}

export function BuscadorMaterias({ busqueda, onBusquedaChange, onBuscar }: BuscadorMateriasProps) {
  const inputId = useId()
  const ayudaId = useId()

  function manejarBusqueda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onBuscar()
  }

  return (
    <form className="buscador-materias" role="search" aria-label="Buscar materias" onSubmit={manejarBusqueda}>
      <label htmlFor={inputId}>Buscar materia</label>
      <div className="buscador-materias__entrada">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          id={inputId}
          name="materia"
          type="search"
          placeholder="Escribe el nombre o código de una materia"
          value={busqueda}
          onChange={(event) => onBusquedaChange(event.target.value)}
          aria-describedby={ayudaId}
        />
      </div>
      <button className="buscador-materias__boton" type="submit">Buscar</button>
      <p id={ayudaId} className="buscador-materias__ayuda">
        Puedes buscar por nombre o código.
      </p>
    </form>
  )
}
