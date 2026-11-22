import type { FiltrosHistorialPaginado, PaginaHistorial } from '../contratos/historial-paginado';

export interface RepositorioHistorial {
  consultar(filtros: FiltrosHistorialPaginado): Promise<Pick<PaginaHistorial, 'items' | 'total'>>;
}
