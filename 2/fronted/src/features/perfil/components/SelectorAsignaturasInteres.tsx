import { useState } from 'react'
import type { Materia } from '../../materias/models/materia'
import { filtrarMaterias } from '../../materias/utils/filtrar-materias'
import { LIMITES_PERFIL } from '../models/perfil'

interface Propiedades {
  materias: Materia[]
  seleccionadas: string[]
  deshabilitado: boolean
  error?: string
  onCambiar: (seleccionadas: string[]) => void
}

export function SelectorAsignaturasInteres({ materias, seleccionadas, deshabilitado, error, onCambiar }: Propiedades) {
  const [busqueda, setBusqueda] = useState('')
  const visibles = filtrarMaterias(materias, busqueda.trim())
  const completo = seleccionadas.length >= LIMITES_PERFIL.asignaturasInteres

  function alternar(idMateria: string) {
    onCambiar(seleccionadas.includes(idMateria)
      ? seleccionadas.filter((id) => id !== idMateria)
      : [...seleccionadas, idMateria])
  }

  return (
    <fieldset className="perfil-propio__asignaturas" disabled={deshabilitado} aria-describedby="perfil-asignaturas-ayuda">
      <legend>Asignaturas de interés</legend>
      <p id="perfil-asignaturas-ayuda" className="perfil-propio__ayuda" aria-live="polite">
        {seleccionadas.length} de {LIMITES_PERFIL.asignaturasInteres} seleccionadas
        {completo && ' · Quita una para elegir otra'}
      </p>
      <label className="perfil-propio__solo-lectores" htmlFor="perfil-buscar-asignatura">Buscar asignatura</label>
      <input
        id="perfil-buscar-asignatura"
        type="search"
        placeholder="Buscar por nombre o código"
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.currentTarget.value)}
      />
      {visibles.length === 0 ? (
        <p className="perfil-propio__ayuda">No hay asignaturas que coincidan con la búsqueda.</p>
      ) : (
        <ul className="perfil-propio__opciones">
          {visibles.map((materia) => {
            const marcada = seleccionadas.includes(materia.idMateria)
            return (
              <li key={materia.idMateria}>
                <label>
                  <input
                    type="checkbox"
                    name="asignaturas"
                    value={materia.idMateria}
                    checked={marcada}
                    disabled={!marcada && completo}
                    onChange={() => alternar(materia.idMateria)}
                  />
                  <span>{materia.nombre} <small>{materia.codigo}</small></span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
      {error && <p className="perfil-propio__error" role="alert">{error}</p>}
    </fieldset>
  )
}
