import './SelectorRol.css'

export type RolVista = 'ESTUDIANTE' | 'TUTOR'

interface Propiedades {
  rolActivo: RolVista
  alCambiar: (rol: RolVista) => void
}

export function SelectorRol({ rolActivo, alCambiar }: Propiedades) {
  const esTutor = rolActivo === 'TUTOR'

  return (
    <button
      type="button"
      className="selector-rol"
      role="switch"
      aria-label="Usar como tutor"
      aria-checked={esTutor}
      onClick={() => alCambiar(esTutor ? 'ESTUDIANTE' : 'TUTOR')}
    >
      <span
        aria-hidden="true"
        className={!esTutor ? 'selector-rol__activo' : ''}
      >
        Estudiante
      </span>

      <span
        aria-hidden="true"
        className={esTutor ? 'selector-rol__activo' : ''}
      >
        Tutor
      </span>
    </button>
  )
}