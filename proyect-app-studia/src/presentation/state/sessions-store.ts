import { createStore } from 'zustand/vanilla';

import type { DisponibilidadUseCases } from '@/application/disponibilidad/disponibilidad';
import type { SesionesUseCases } from '@/application/sesiones/sesiones';
import type { ClosureResult, MyAvailabilityBlock, Session } from '@/domain/sesiones/session';
import { countPendingRequests, type FlowResult, type FlowState } from '@/domain/sesiones/session-machine';
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

export type SessionsState = {
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
  /** Lo llama `di/container` cuando cambia el estado de la sesión del usuario (login/logout). */
  handleAuthChange: (isAuthenticated: boolean) => void;
};

export type SessionsStoreDeps = {
  /** true con backend (EXPO_PUBLIC_API_URL); sin ella, los datos nacen en `seed` y no se recargan. */
  api: boolean;
  /** Estado inicial: `MOCK_SESSIONS`/`MOCK_NOW` en demo, vacío con backend (lo decide `di/container`). */
  seed: FlowState;
  sesiones: Pick<SesionesUseCases, 'listar' | 'responder' | 'cancelar' | 'declarar' | 'calificar' | 'reportar'>;
  disponibilidad: Pick<DisponibilidadUseCases, 'misBloques' | 'publicar' | 'actualizar' | 'quitar'>;
  /** Con backend: si el usuario actual puede tener horarios propios publicados. */
  isTutor: () => boolean;
  now?: () => string;
};

/**
 * Estado global de sesiones/solicitudes. Es una fábrica (como `authStore`/`preferencesStore`) para
 * poder probarla con casos de uso falsos. Sin backend, todas las pantallas leen y escriben aquí sobre
 * `session-machine`; con backend, `reload` y `remote` llaman a agendamiento-sesiones y recargan.
 */
export function createSessionsStore(deps: SessionsStoreDeps) {
  const { api } = deps;
  const nowIso = deps.now ?? (() => new Date().toISOString());

  return createStore<SessionsState>()((set, get) => {
    const commit = (next: FlowState) =>
      set({ sessions: next.sessions, now: next.clock, reserved: next.reserved, pendingCount: countPendingRequests(next.sessions) });

    const run = (op: (s: FlowState) => FlowResult): FlowResult => {
      const { sessions, now: clock, reserved } = get();
      const result = op({ sessions, clock, reserved });
      if (result.ok) commit(result.state);
      return result;
    };

    const reload = async (): Promise<void> => {
      if (!api) return;
      try {
        const [sessions, bloques] = await Promise.all([
          deps.sesiones.listar(),
          deps.isTutor() ? deps.disponibilidad.misBloques() : Promise.resolve<MyAvailabilityBlock[]>([]),
        ]);
        commit({ sessions, clock: nowIso(), reserved: get().reserved });
        set({ myAvailability: bloques, loadError: null });
      } catch (e) {
        set({ loadError: errorMessage(e) });
      } finally {
        set({ loaded: true });
      }
    };

    const publishAvailability = (input: PublishAvailabilityInput): PublishAvailabilityResult | Promise<PublishAvailabilityResult> => {
      if (!api && !input.subjectCode) return { ok: false, error: 'Elige una materia.' };
      if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
        return { ok: false, error: 'La hora de término debe ser posterior al inicio.' };
      }
      if (api) {
        return deps.disponibilidad.publicar(input).then(async (res): Promise<PublishAvailabilityResult> => {
          if (!res.ok) return res;
          await reload();
          return { ok: true };
        });
      }
      if (!Number.isInteger(input.capacity) || input.capacity < 1) {
        return { ok: false, error: 'La capacidad debe ser un entero de al menos 1.' };
      }
      set((state) => ({
        myAvailability: [{ id: `my-${state.myAvailability.length + 1}-${Date.now()}`, enrolled: 0, ...input }, ...state.myAvailability],
      }));
      return { ok: true };
    };

    const updateAvailability = async (id: string, input: PublishAvailabilityInput): Promise<PublishAvailabilityResult> => {
      if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
        return { ok: false, error: 'La hora de término debe ser posterior al inicio.' };
      }
      if (!api) {
        set((state) => ({ myAvailability: state.myAvailability.map((b) => (b.id === id ? { ...b, ...input } : b)) }));
        return { ok: true };
      }
      const res = await deps.disponibilidad.actualizar(id, input);
      if (!res.ok) return res;
      await reload();
      return { ok: true };
    };

    const removeAvailability = async (id: string): Promise<PublishAvailabilityResult> => {
      if (!api) {
        set((state) => ({ myAvailability: state.myAvailability.filter((b) => b.id !== id) }));
        return { ok: true };
      }
      const res = await deps.disponibilidad.quitar(id);
      if (!res.ok) return res;
      await reload();
      return { ok: true };
    };

    // Cada acción pasa por su caso de uso (que nunca lanza) y, si funcionó, se recargan las sesiones.
    const call =
      <A extends unknown[]>(fn: (...args: A) => Promise<{ ok: true } | { ok: false; error: string }>) =>
      async (...args: A): Promise<RemoteResult> => {
        const res = await fn(...args);
        if (!res.ok) return res;
        await reload();
        return { ok: true };
      };
    const remote: RemoteActions = {
      respond: call(deps.sesiones.responder),
      cancel: call(deps.sesiones.cancelar),
      declare: call(deps.sesiones.declarar),
      rate: call(deps.sesiones.calificar),
      report: call(deps.sesiones.reportar),
    };

    // Con backend el reloj es el real (lo usan los avisos y fases de check-in).
    if (api) {
      const timer = setInterval(() => commit({ sessions: get().sessions, clock: nowIso(), reserved: get().reserved }), 30_000);
      // En Node (pruebas) el timer no debe mantener el proceso vivo; en React Native no existe `unref`.
      (timer as unknown as { unref?: () => void }).unref?.();
    }

    return {
      sessions: deps.seed.sessions,
      now: deps.seed.clock,
      reserved: deps.seed.reserved,
      pendingCount: countPendingRequests(deps.seed.sessions),
      lastViewedId: null,
      setLastViewed: (id: string) => set({ lastViewedId: id }),
      run,
      myAvailability: [],
      publishAvailability,
      updateAvailability,
      removeAvailability,
      reload,
      loadError: null,
      loaded: !api,
      remote,
      handleAuthChange: (isAuthenticated: boolean) => {
        if (!api) return;
        if (isAuthenticated) {
          void reload();
        } else {
          // Al cerrar sesión se limpia lo del usuario anterior.
          set({ sessions: [], now: nowIso(), reserved: {}, pendingCount: 0, myAvailability: [], loaded: false, loadError: null });
        }
      },
    };
  });
}

export type SessionsStore = ReturnType<typeof createSessionsStore>;
