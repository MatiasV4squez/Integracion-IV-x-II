import { useEffect, useEffectEvent, useState } from 'react';

export type AsyncState<T> = {
  /** Último dato válido para la `key` actual (se mantiene durante un refresh, aunque falle). */
  data: T | undefined;
  error: Error | undefined;
  /** Primera carga (o reintento sin datos previos): mostrar <LoadingState />. */
  isLoading: boolean;
  /** Recarga iniciada por el usuario (pull-to-refresh): mantener el contenido visible. */
  isRefreshing: boolean;
  refresh: () => void;
};

type Snapshot<T> = { key: string; data?: T; error?: Error };

export const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

/**
 * Carga asíncrona atada a una `key`: cuando cambia, se vuelve a pedir y la petición anterior
 * se cancela. `key = null` desactiva la carga (p. ej. falta un parámetro).
 */
export function useAsync<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null);
  const [nonce, setNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const load = useEffectEvent((signal: AbortSignal) => fetcher(signal));

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setSnapshot({ key, data });
        setRefreshing(false);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setSnapshot((prev) => ({ key, data: prev?.key === key ? prev.data : undefined, error: toError(error) }));
        setRefreshing(false);
      },
    );
    return () => controller.abort();
  }, [key, nonce]);

  const current = key !== null && snapshot?.key === key;
  const data = current ? snapshot.data : undefined;

  return {
    data,
    error: current ? snapshot.error : undefined,
    isLoading: key !== null && data === undefined && (!current || refreshing),
    isRefreshing: refreshing && data !== undefined,
    refresh: () => {
      setRefreshing(true);
      setNonce((n) => n + 1);
    },
  };
}
