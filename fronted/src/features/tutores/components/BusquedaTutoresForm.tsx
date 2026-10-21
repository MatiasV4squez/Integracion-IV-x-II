import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Materia } from '../../materias/models/materia'
import type { CriteriosBusquedaTutores } from '../models/criterios-busqueda-tutores'
import './BusquedaTutoresForm.css'

interface BusquedaTutoresFormProps {
  materias: Materia[]
  materiaInicialId: string
  onBuscar: (criterios: CriteriosBusquedaTutores) => void
}

export function BusquedaTutoresForm({
  materias, materiaInicialId, onBuscar,
}: BusquedaTutoresFormProps) {
  const id = useId()
  const [materiaId, setMateriaId] = useState(materiaInicialId)

  function enviarBusqueda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (materias.some((materia) => materia.idMateria === materiaId)) onBuscar({ materiaId })
  }

  return (
    <form className="busqueda-tutores-form" role="search" aria-label="Buscar tutores" onSubmit={enviarBusqueda}>
      <div className="busqueda-tutores-form__campo busqueda-tutores-form__materia">
        <label htmlFor={id + '-materia'}>Materia</label>
        <select
          id={id + '-materia'}
          name="materiaId"
          value={materiaId}
          onChange={(event) => setMateriaId(event.target.value)}
          disabled={materias.length === 0}
          aria-describedby={materias.length === 0 ? id + '-ayuda' : undefined}
          required
        >
          <option value="">Selecciona una materia</option>
          {materias.map((materia) => (
            <option key={materia.idMateria} value={materia.idMateria}>
              {materia.nombre} · {materia.codigo}
            </option>
          ))}
        </select>
      </div>
      <div className="busqueda-tutores-form__campo">
        <label htmlFor={id + '-disponibilidad'}>Disponibilidad</label>
        <select
          id={id + '-disponibilidad'}
          name="disponibilidad"
          defaultValue="cualquiera"
          disabled
          aria-describedby={id + '-filtros-ayuda'}
        >
          <option value="cualquiera">Cualquier horario</option>
          <option value="con-horarios">Con horarios disponibles</option>
        </select>
      </div>
      <div className="busqueda-tutores-form__campo">
        <label htmlFor={id + '-orden'}>Ordenar por</label>
        <select
          id={id + '-orden'}
          name="orden"
          defaultValue="predeterminado"
          disabled
          aria-describedby={id + '-filtros-ayuda'}
        >
          <option value="predeterminado">Orden predeterminado</option>
          <option value="calificacion-desc">Mejor calificación</option>
          <option value="calificacion-asc">Menor calificación</option>
        </select>
      </div>
      <button
        className="busqueda-tutores-form__buscar"
        type="submit"
        disabled={materias.length === 0 || !materiaId}
      >
        Buscar
      </button>
      <p id={id + '-filtros-ayuda'} className="busqueda-tutores-form__ayuda">
        Los filtros de disponibilidad y orden estarán disponibles próximamente.
      </p>
      {materias.length === 0 && (
        <p id={id + '-ayuda'} className="busqueda-tutores-form__ayuda">
          No hay materias disponibles para buscar.
        </p>
      )}
    </form>
  )
}
