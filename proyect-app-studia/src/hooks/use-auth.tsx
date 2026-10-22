import { useStore } from 'zustand';

import { authStore, preferencesStore } from '@/store';
import type { AuthState } from '@/store/create-auth-store';

/** Estado global de la sesión (Zustand). Con `selector` solo se re-renderiza cuando cambia lo que se pide. */
export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  return useStore(authStore, selector);
}

/**
 * Sesión del usuario. Mantiene `isAuthenticated`, `login` y `logout` que ya usaban las pantallas,
 * y agrega los datos del usuario, el estado de carga y los mensajes.
 */
export function useAuth() {
  const state = useStore(authStore);
  return {
    ...state,
    isAuthenticated: state.status === 'authenticated',
    isHydrating: state.status === 'hydrating',
    roles: state.user?.roles ?? [],
    async logout() {
      await state.logout();
      // Al cerrar sesión se vuelve al modo Tutee: la próxima persona que entre no hereda el modo.
      preferencesStore.getState().setTutorMode(false);
    },
  };
}
