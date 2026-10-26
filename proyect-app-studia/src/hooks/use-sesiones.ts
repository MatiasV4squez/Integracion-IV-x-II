import { useMemo, useState } from 'react';

import { isApiEnabled, mockResponse } from '@/api/client';
import { fetchSesiones, type SesionesFilter } from '@/api/sesiones';
import { useAsync, type AsyncState } from '@/hooks/use-async';
import { useSessions } from '@/state/sessions-context';
import type { Session } from '@/types/session';

/**
 * Sesiones del usuario ("mis sesiones"), opcionalmente filtradas por rol y estado.
 * Sin backend se leen de SessionsProvider, así los cambios hechos en otras pantallas se ven al tiro.
 */
export function useSesiones(filter: SesionesFilter = {}): AsyncState<Session[]> {
  const { role, status } = filter;
  const { sessions } = useSessions();
  const [refreshingLocal, setRefreshingLocal] = useState(false);

  const remote = useAsync(isApiEnabled() ? `sesiones:${role ?? '*'}:${status ?? '*'}` : null, (signal) =>
    fetchSesiones({ role, status }, signal),
  );

  const local = useMemo(
    () => sessions.filter((s) => (!role || s.myRole === role) && (!status || s.status === status)),
    [sessions, role, status],
  );

  if (isApiEnabled()) return remote;
  return {
    data: local,
    error: undefined,
    isLoading: false,
    isRefreshing: refreshingLocal,
    refresh: () => {
      setRefreshingLocal(true);
      mockResponse(null).finally(() => setRefreshingLocal(false));
    },
  };
}
