import { useStore } from 'zustand';

import { sessionsStore } from '@/di/container';
import type { SessionsState } from '@/presentation/state/sessions-store';

/** Sesiones/solicitudes del usuario (Zustand): con backend se recargan desde agendamiento-sesiones. */
export function useSessions(): SessionsState {
  return useStore(sessionsStore);
}
