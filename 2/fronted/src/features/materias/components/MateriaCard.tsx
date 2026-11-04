import { Link } from 'react-router'
import type { Materia } from '../models/materia'
import './MateriaCard.css'

interface MateriaCardProps {
  materia: Materia
  destino?: string
}

export function MateriaCard({ materia, destino }: MateriaCardProps) {
  const contenido = (
    <>
      <h3>{materia.nombre}</h3>
      <p className="materia-card__codigo">
        <span>Código: </span>{materia.codigo}
      </p>
    </>
  )

  if (destino) {
    return (
      <Link
        className="materia-card materia-card--enlace"
        to={destino}
        aria-label={'Buscar tutores de ' + materia.nombre + ', código ' + materia.codigo}
      >
        {contenido}
      </Link>
    )
  }

  return <article className="materia-card">{contenido}</article>
}
