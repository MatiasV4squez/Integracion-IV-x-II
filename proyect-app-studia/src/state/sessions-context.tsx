import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { MOCK_NOW, MOCK_SESSIONS } from '@/mocks/sessions';
import type { Session } from '@/types/session';
import { countPendingRequests, type FlowResult, type FlowState } from '@/utils/session-machine';

type Store = {
  sessions: Session[];
  /** "Ahora" simulado: avanza con cada acción para poder probar el flujo completo. */
  now: string;
  /** Cupos reservados durante esta sesión de uso, por bloque. */
  reserved: Record<string, number>;
  pendingCount: number;
  /** Última sesión abierta (la usa la pestaña "Detalle" de la barra superior). */
  lastViewedId: string | null;
  setLastViewed: (id: string) => void;
  /** Ejecuta una operación pura de session-machine y actualiza el estado si fue válida. */
  run: (op: (state: FlowState) => FlowResult) => FlowResult;
};

const SessionsContext = createContext<Store | null>(null);

/**
 * Estado compartido de sesiones/solicitudes. Mientras no exista backend, todas las
 * pantallas leen y escriben aquí, así que un cambio en una se ve en las demás.
 */
export function SessionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>({ sessions: MOCK_SESSIONS, clock: MOCK_NOW, reserved: {} });
  const [lastViewedId, setLastViewedId] = useState<string | null>(null);
  const ref = useRef(state);

  const run = useCallback((op: (s: FlowState) => FlowResult) => {
    const result = op(ref.current);
    if (result.ok) {
      ref.current = result.state;
      setState(result.state);
    }
    return result;
  }, []);

  const value = useMemo<Store>(
    () => ({
      sessions: state.sessions,
      now: state.clock,
      reserved: state.reserved,
      pendingCount: countPendingRequests(state.sessions),
      lastViewedId,
      setLastViewed: setLastViewedId,
      run,
    }),
    [state, lastViewedId, run],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions(): Store {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions debe usarse dentro de <SessionsProvider>');
  return ctx;
}
