import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { MOCK_NOW, MOCK_SESSIONS } from '@/mocks/sessions';
import type { MyAvailabilityBlock, Session } from '@/types/session';
import { countPendingRequests, type FlowResult, type FlowState } from '@/utils/session-machine';

export type PublishAvailabilityInput = { subjectCode: string; startsAt: string; endsAt: string; capacity: number };
export type PublishAvailabilityResult = { ok: true } | { ok: false; error: string };

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
  /** Horarios que el usuario actual publicó como Tutor. */
  myAvailability: MyAvailabilityBlock[];
  /** Reserva (publica) un nuevo horario propio para dictar tutoría. */
  publishAvailability: (input: PublishAvailabilityInput) => PublishAvailabilityResult;
};

const SessionsContext = createContext<Store | null>(null);

/**
 * Estado compartido de sesiones/solicitudes. Mientras no exista backend, todas las
 * pantallas leen y escriben aquí, así que un cambio en una se ve en las demás.
 */
export function SessionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>({ sessions: MOCK_SESSIONS, clock: MOCK_NOW, reserved: {} });
  const [lastViewedId, setLastViewedId] = useState<string | null>(null);
  const [myAvailability, setMyAvailability] = useState<MyAvailabilityBlock[]>([]);
  const ref = useRef(state);

  const run = useCallback((op: (s: FlowState) => FlowResult) => {
    const result = op(ref.current);
    if (result.ok) {
      ref.current = result.state;
      setState(result.state);
    }
    return result;
  }, []);

  const publishAvailability = useCallback((input: PublishAvailabilityInput): PublishAvailabilityResult => {
    if (!input.subjectCode) return { ok: false, error: 'Elige una materia.' };
    if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
      return { ok: false, error: 'La hora de término debe ser posterior al inicio.' };
    }
    if (!Number.isInteger(input.capacity) || input.capacity < 1) {
      return { ok: false, error: 'La capacidad debe ser un entero de al menos 1.' };
    }
    setMyAvailability((prev) => [
      { id: `my-${prev.length + 1}-${Date.now()}`, enrolled: 0, ...input },
      ...prev,
    ]);
    return { ok: true };
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
      myAvailability,
      publishAvailability,
    }),
    [state, lastViewedId, run, myAvailability, publishAvailability],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions(): Store {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions debe usarse dentro de <SessionsProvider>');
  return ctx;
}
