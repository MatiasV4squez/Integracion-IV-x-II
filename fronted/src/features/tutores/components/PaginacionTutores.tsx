import './PaginacionTutores.css'

interface PaginacionTutoresProps {
  page: number
  totalPages: number
  onCambiarPagina: (page: number) => void
}

export function PaginacionTutores({ page, totalPages, onCambiarPagina }: PaginacionTutoresProps) {
  if (totalPages < 2 || page > totalPages) return null

  return (
    <nav className="paginacion-tutores" aria-label="Páginas de tutores">
      <button type="button" disabled={page <= 1} onClick={() => onCambiarPagina(page - 1)}>
        Anterior
      </button>
      <p aria-live="polite">Página {page} de {totalPages}</p>
      <button type="button" disabled={page >= totalPages} onClick={() => onCambiarPagina(page + 1)}>
        Siguiente
      </button>
    </nav>
  )
}
