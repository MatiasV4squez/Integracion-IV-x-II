import './Paginacion.css'

export interface PaginacionProps {
  page: number
  totalPages: number
  onCambiarPagina: (page: number) => void
  etiqueta?: string
  deshabilitada?: boolean
}

export function Paginacion({ page, totalPages, onCambiarPagina, etiqueta = 'Paginación', deshabilitada = false }: PaginacionProps) {
  if (!Number.isSafeInteger(page) || !Number.isSafeInteger(totalPages)
    || page < 1 || totalPages < 2 || page > totalPages) return null

  return (
    <nav className="paginacion" aria-label={etiqueta}>
      <button type="button" disabled={deshabilitada || page === 1} onClick={() => onCambiarPagina(page - 1)}>
        Anterior
      </button>
      <p aria-live="polite" aria-atomic="true">Página {page} de {totalPages}</p>
      <button type="button" disabled={deshabilitada || page === totalPages} onClick={() => onCambiarPagina(page + 1)}>
        Siguiente
      </button>
    </nav>
  )
}
