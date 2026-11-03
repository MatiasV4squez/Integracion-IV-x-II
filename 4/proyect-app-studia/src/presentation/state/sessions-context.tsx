import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { isApiEnabled, useCases } from '@/di/container';
import { MOCK_NOW, MOCK_SESSIONS } from '@/di/demo';
import { isTutor } from '@/domain/auth/auth';
import type { ClosureResult, MyAvailabilityBlock, Session } from '@/domain/sesiones/session';
import { countPendingRequests, type FlowResult, type FlowState } from '@/domain/sesiones/session-machine';
import { useAuthStore } from '@/presentation/hooks/use-auth';
import { errorMessage } from '@/shared/errors';

export type PublishAvailabilityInput = { subjectCode: string; startsAt: string; endsAt: string; capacity: number };
export type PublishAvailabilityResult = { ok: true } | { ok: false; error: string };
export type RemoteResult = { ok: true } | { ok: false; error: string };

/** Acciones contra agendamiento-sesiones / reportes-moderacion (solo con backend). */
export type RemoteActions = {
  respond: (id: string, accept: boolean) => Promise<RemoteResult>;
  cancel: (id: string) => Promise<RemoteResult>;
  declare: (session: Session, result: ClosureResult) => Promise<RemoteResult>;
  rate: (id: string, rating: number) => Promise<RemoteResult>;
  report: (session: Session, reason: string, description: string) => Promise<RemoteResult>;
};

type Store = {
  sessions: Session[];
  /** "Ahora": simulado en modo demo (avanza con cada acción); real con backend. */
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
  publishAvailability: (input: PublishAvailabilityInput) => PublishAvailabilityResult | Promise<PublishAvailabilityResult>;
  /** Cambia el día/horario de un horario propio que nadie ha reservado. */
  updateAvailability: (id: string, input: PublishAvailabilityInput) => Promise<PublishAvailabilityResult>;
  /** Quita (desactiva) un horario propio que nadie ha reservado. */
  removeAvailability: (id: string) => Promise<PublishAvailabilityResult>;
  /** Con backend: vuelve a pedir las sesiones y horarios. En demo no hace nada. */
  reload: () => Promise<void>;
  /** Con backend: error de la última carga de sesiones. */
  loadError: string | null;
  /** false hasta que termina la primera carga desde el backend (siempre true en demo). */
  loaded: boolean;
  remote: RemoteActions;
};

const SessionsContext = createContext<Store | null>(null);

/**
 * Estado compartido de sesiones/solicitudes. Sin backend, todas las pantallas leen y escriben
 * aquí. Con backend (EXPO_PUBLIC_API_URL), las sesiones vienen de agendamiento-sesiones y las
 * acciones de `remote` se aplican en los microservicios y luego se recarga.
 */
export function SessionsProvider({ children }: { children: ReactNode }) {
  const api = isApiEnabled();
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  const tutor = useAuthStore((state) => isTutor(state.user));
  const [state, setState] = useState<FlowState>(() =>
    api ? { sessions: [], clock: new Date().toISOString(), reserved: {} } : { sessions: MOCK_SESSIONS, clock: MOCK_NOW, reserved: {} },
  );
  const [lastViewedId, setLastViewedId] = useState<string | null>(null);
  const [myAvailability, setMyAvailability] = useState<MyAvailabilityBlock[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!api);
  const ref = useRef(state);

  const commit = useCallback((next: FlowState) => {
    ref.current = next;
    setState(next);
  }, []);

  const run = useCallback(
    (op: (s: FlowState) => FlowResult) => {
      const result = op(ref.current);
      if (result.ok) commit(result.state);
      return result;
    },
    [commit],
  );


  const reload = useCallback(async () => {
    if (!api || !isAuthenticated) return;
    try {
      const [sessions, bloques] = await Promise.all([
        useCases.sesiones.listar(),
        tutor ? useCases.disponibilidad.misBloques() : Promise.resolve<MyAvailabilityBlock[]>([]),
      ]);
      commit({ ...ref.current, sessions, clock: new Date().toISOString() });
      setMyAvailability(bloques);
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, [api, isAuthenticated, tutor, commit]);

  // Al cerrar sesión se limpia lo del usuario anterior (sincronizado durante el render, no en
  // un efecto, siguiendo el patrón de React para "adjusting state when a prop changes").
  const [prevAuthenticated, setPrevAuthenticated] = useState(isAuthenticated);
  if (api && isAuthenticated !== prevAuthenticated) {
    setPrevAuthenticated(isAuthenticated);
    if (!isAuthenticated) {
      setState({ sessions: [], clock: new Date().toISOString(), reserved: {} });
      setMyAvailability([]);
      setLoaded(false);
      setLoadError(null);
    }
  }

  // Mantiene `ref` al día también cuando el estado se reinicia durante el render.
  useEffect(() => {
    ref.current = state;
  }, [state]);

  // Carga inicial al iniciar sesión.
  useEffect(() => {
    if (api && isAuthenticated) void reload();
  }, [api, isAuthenticated, reload]);

  // Con backend el reloj es el real (lo usan los avisos y fases de check-in).
  useEffect(() => {
    if (!api) return;
    const timer = setInterval(() => commit({ ...ref.current, clock: new Date().toISOString() }), 30000);
    return () => clearInterval(timer);
  }, [api, commit]);

  const publishAvailability = useCallback(
    (input: PublishAvailabilityInput): PublishAvailabilityResult | Promise<PublishAvailabilityResult> => {
      if (!api && !input.subjectCode) return { ok: false, error: 'Elige una materia.' };
      if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
        return { ok: false, error: 'La hora de término debe ser posterior al inicio.' };
      }
      if (api) {
        return useCases.disponibilidad.publicar(input).then(async (res): Promise<PublishAvailabilityResult> => {
          if (!res.ok) return res;
          await reload();
          return { ok: true };
        });
      }
      if (!Number.isInteger(input.capacity) || input.capacity < 1) {
        return { ok: false, error: 'La capacidad debe ser un entero de al menos 1.' };
      }
      setMyAvailability((prev) => [{ id: `my-${prev.length + 1}-${Date.now()}`, enrolled: 0, ...input }, ...prev]);
      return { ok: true };
    },
    [api, reload],
  );

  const updateAvailability = useCallback(
    async (id: string, input: PublishAvailabilityInput): Promise<PublishAvailabilityResult> => {
      if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
        return { ok: false, error: 'La hora de término debe ser posterior al inicio.' };
      }
      if (!api) {
        setMyAvailability((prev) => prev.map((b) => (b.id === id ? { ...b, ...input } : b)));
        return { ok: true };
      }
      const res = await useCases.disponibilidad.actualizar(id, input);
      if (!res.ok) return res;
      await reload();
      return { ok: true };
    },
    [api, reload],
  );

  const removeAvailability = useCallback(
    async (id: string): Promise<PublishAvailabilityResult> => {
      if (!api) {
        setMyAvailability((prev) => prev.filter((b) => b.id !== id));
        return { ok: true };
      }
      const res = await useCases.disponibilidad.quitar(id);
      if (!res.ok) return res;
      await reload();
      return { ok: true };
    },
    [api, reload],
  );

  const remote = useMemo<RemoteActions>(() => {
    // Cada acción pasa por su caso de uso (que nunca lanza) y, si funcionó, se recargan las sesiones.
    const call =
      <A extends unknown[]>(fn: (...args: A) => Promise<{ ok: true } | { ok: false; error: string }>) =>
      async (...args: A): Promise<RemoteResult> => {
        const res = await fn(...args);
        if (!res.ok) return res;
        await reload();
        return { ok: true };
      };
    const { sesiones } = useCases;
    return {
      respond: call(sesiones.responder),
      cancel: call(sesiones.cancelar),
      declare: call(sesiones.declarar),
      rate: call(sesiones.calificar),
      report: call(sesiones.reportar),
    };
  }, [reload]);

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
      updateAvailability,
      removeAvailability,
      reload,
      loadError,
      loaded,
      remote,
    }),
    [state, lastViewedId, run, myAvailability, publishAvailability, updateAvailability, removeAvailability, reload, loadError, loaded, remote],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions(): Store {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions debe usarse dentro de <SessionsProvider>');
  return ctx;
}
