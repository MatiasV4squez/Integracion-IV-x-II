import { useState } from 'react';

/**
 * Paginación en el cliente para listas que ya están completas en memoria (p. ej. el historial):
 * renderiza de a `pageSize` ítems y suma otra página con `loadMore`.
 */
export function useClientPagination<T>(all: T[], pageSize = 10) {
  const [limit, setLimit] = useState(pageSize);
  return {
    items: all.slice(0, limit),
    hasMore: all.length > limit,
    loadMore: () => setLimit((l) => (l < all.length ? l + pageSize : l)),
    reset: () => setLimit(pageSize),
  };
}
