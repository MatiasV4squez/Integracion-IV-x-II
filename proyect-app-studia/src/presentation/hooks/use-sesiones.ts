import { useMemo, useState } from 'react';

import { filtrarSesiones } from '@/application/sesiones/sesiones';
import { isApiEnabled } from '@/di/container';
import type { AsyncState } from '@/presentation/hooks/use-async';
import { useSessions } from '@/presentation/state/sessions-context';
import type { SesionesFilter, Session } from '@/domain/sesiones/session';

/**
 * Sesiones del usuario ("mis sesiones"), opcionalmente filtradas por rol y estado.
 * Siempre se leen de SessionsProvider (que con backend las carga desde agendamiento-sesiones),
 * así los cambios hechos en otras pantallas se ven al tiro.
 */
export function useSesiones(filter: SesionesFilter = {}): AsyncState<Session[]> {
  const { role, status } = filter;
  const { sessions, reload, loadError, loaded } = useSessions();
  const [refreshing, setRefreshing] = useState(false);

  const data = useMemo(() => filtrarSesiones(sessions, { role, status }), [sessions, role, status]);

  return {
    data: loaded && !(loadError && sessions.length === 0) ? data : undefined,
    error: loadError ? new Error(loadError) : undefined,
    isLoading: !loaded,
    isRefreshing: refreshing,
    refresh: () => {
      setRefreshing(true);
      const done = () => setRefreshing(false);
      // En la demo no hay nada que recargar: solo se muestra el indicador un momento.
      if (isApiEnabled()) reload().finally(done);
      else setTimeout(done, 400);
    },
  };
}
