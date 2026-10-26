import { useEffect, useEffectEvent, useRef, useState } from 'react';

import type { Page } from '@/api/client';
import { toError } from '@/hooks/use-async';

export type PaginatedState<T> = {
  /** Ítems de todas las páginas cargadas; undefined hasta que llega la primera. */
  items: T[] | undefined;
  total: number;
  hasMore: boolean;
  error: Error | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  /** Vuelve a la página 1 (pull-to-refresh o reintento). */
  refresh: () => void;
  /** Pide la página siguiente (fin de la lista o botón "Cargar más"). */
  loadMore: () => void;
};

type Snapshot<T> = { key: string; items?: T[]; page: number; total: number; hasMore: boolean; error?: Error };

/** Listado paginado atado a una `key` (filtros); al cambiarla se reinicia en la página 1. */
export function usePaginated<T>(
  key: string | null,
  fetchPage: (page: number, signal?: AbortSignal) => Promise<Page<T>>,
): PaginatedState<T> {
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null);
  const [nonce, setNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const inFlight = useRef(false);
  const loadFirst = useEffectEvent((signal: AbortSignal) => fetchPage(1, signal));

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    loadFirst(controller.signal).then(
      (p) => {
        if (controller.signal.aborted) return;
        setSnapshot({ key, items: p.items, page: p.page, total: p.total, hasMore: p.hasMore });
        setRefreshing(false);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setSnapshot((prev) =>
          prev?.key === key ? { ...prev, error: toError(error) } : { key, page: 0, total: 0, hasMore: false, error: toError(error) },
        );
        setRefreshing(false);
      },
    );
    return () => controller.abort();
  }, [key, nonce]);

  const current = key !== null && snapshot?.key === key ? snapshot : null;
  const items = current?.items;

  const loadMore = () => {
    if (!current || !current.items || !current.hasMore || inFlight.current || refreshing) return;
    inFlight.current = true;
    setLoadingMore(true);
    fetchPage(current.page + 1)
      .then(
        (p) =>
          setSnapshot((prev) =>
            prev?.key === current.key && prev.items
              ? { ...prev, items: [...prev.items, ...p.items], page: p.page, total: p.total, hasMore: p.hasMore, error: undefined }
              : prev,
          ),
        (error: unknown) => setSnapshot((prev) => (prev?.key === current.key ? { ...prev, error: toError(error) } : prev)),
      )
      .finally(() => {
        inFlight.current = false;
        setLoadingMore(false);
      });
  };

  return {
    items,
    total: current?.total ?? 0,
    hasMore: current?.hasMore ?? false,
    error: current?.error,
    isLoading: key !== null && items === undefined && (!current || refreshing),
    isRefreshing: refreshing && items !== undefined,
    isLoadingMore: loadingMore,
    refresh: () => {
      setRefreshing(true);
      setNonce((n) => n + 1);
    },
    loadMore,
  };
}
