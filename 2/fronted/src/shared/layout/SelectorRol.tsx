import './SelectorRol.css'

export type RolVista = 'ESTUDIANTE' | 'TUTOR'

interface Propiedades {
  rolActivo: RolVista
  alCambiar: (rol: RolVista) => void
}

export function SelectorRol({ rolActivo, alCambiar }: Propiedades) {
  return (
    <div className="selector-rol" role="group" aria-label="Cambiar contexto">
      <button type="button" aria-pressed={rolActivo === 'ESTUDIANTE'} onClick={() => alCambiar('ESTUDIANTE')}>Estudiante</button>
      <button type="button" aria-pressed={rolActivo === 'TUTOR'} onClick={() => alCambiar('TUTOR')}>Tutor</button>
    </div>
  )
}
