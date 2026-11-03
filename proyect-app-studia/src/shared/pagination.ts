/** Página de resultados de un listado. */
export type Page<T> = { items: T[]; page: number; pageSize: number; total: number; hasMore: boolean };

export function paginate<T>(all: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), page, pageSize, total: all.length, hasMore: start + pageSize < all.length };
}
