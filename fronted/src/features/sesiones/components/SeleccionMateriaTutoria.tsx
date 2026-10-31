import { useState } from 'react'
import type { Materia } from '../../materias/models/materia'

interface Propiedades {
  materias: Materia[]
  materiaInvalida: boolean
  onElegir: (idMateria: string) => void
}

export function SeleccionMateriaTutoria({ materias, materiaInvalida, onElegir }: Propiedades) {
  const [idMateria, setIdMateria] = useState('')
  return (
    <form
      className="seleccion-tutoria__formulario"
      onSubmit={(evento) => {
        evento.preventDefault()
        if (idMateria) onElegir(idMateria)
      }}
    >
      {materiaInvalida && <p role="alert">La materia indicada no existe en el catálogo. Elige una de la lista.</p>}
      <label htmlFor="solicitud-materia">Materia</label>
      <select id="solicitud-materia" value={idMateria} required onChange={(evento) => setIdMateria(evento.currentTarget.value)}>
        <option value="">Selecciona una materia</option>
        {materias.map((materia) => (
          <option key={materia.idMateria} value={materia.idMateria}>{materia.codigo} · {materia.nombre}</option>
        ))}
      </select>
      <button type="submit" disabled={!idMateria}>Ver tutores disponibles</button>
    </form>
  )
}
