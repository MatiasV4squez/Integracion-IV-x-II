import { createStore } from 'zustand/vanilla';

import { AUTH } from '@/shared/app-config';
import type { AuthService } from '@/application/auth/auth-service';
import type { LoginInput, RegisterInput, ServiceResult, User } from '@/domain/auth/auth';

export type AuthStatus = 'hydrating' | 'unauthenticated' | 'authenticated';

export type AuthState = {
  status: AuthStatus;
  user: User | null;
  lastActivityAt: number;
  /** Último error de inicio de sesión, listo para mostrar. */
  error: string | null;
  /** Aviso informativo (por ejemplo, "tu sesión expiró"). */
  notice: string | null;
  /** Recupera la sesión guardada al abrir la app. */
  hydrate: () => Promise<void>;
  login: (input: LoginInput) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (input: RegisterInput) => Promise<ServiceResult<User>>;
  verifyEmail: (email: string) => Promise<ServiceResult<User>>;
  /** Confirma el correo con el token del enlace (con backend). */
  confirmEmail: (token: string) => Promise<ServiceResult<null>>;
  /** Reenvía el enlace de verificación al correo (con backend). */
  resendVerification: (email: string) => Promise<ServiceResult<null>>;
  /** true si la verificación del correo se hace con un enlace real (backend) y no simulada. */
  verifiesByEmailLink: boolean;
  /** Cierra la sesión local porque el servidor rechazó el token (vencido o revocado). */
  expire: (notice: string) => Promise<void>;
  /** Registra actividad (como máximo una vez cada 30 s). */
  touch: () => Promise<void>;
  /** Cierra la sesión si pasó el tiempo máximo de inactividad (NFR04). Se llama al volver a la app. */
  checkInactivity: () => Promise<void>;
  clearMessages: () => void;
};

export type AuthStoreOptions = { now?: () => number };

/** Estado global de la sesión. Es una fábrica para poder probarla con un servicio falso. */
export function createAuthStore(service: AuthService, options: AuthStoreOptions = {}) {
  const now = options.now ?? Date.now;

  return createStore<AuthState>()((set, get) => ({
    status: 'hydrating',
    user: null,
    lastActivityAt: 0,
    error: null,
    notice: null,

    async hydrate() {
      const result = await service.restoreSession();
      if (result.ok) {
        set({ status: 'authenticated', user: result.data.user, lastActivityAt: result.data.lastActivityAt, error: null });
      } else {
        set({ status: 'unauthenticated', user: null, notice: result.error === 'SESSION_EXPIRED' ? result.message : null });
      }
    },

    async login(input) {
      set({ error: null, notice: null });
      const result = await service.login(input);
      if (!result.ok) {
        set({ error: result.message });
        return false;
      }
      set({ status: 'authenticated', user: result.data.user, lastActivityAt: result.data.lastActivityAt, error: null });
      return true;
    },

    async logout() {
      await service.logout();
      // notice: null por si el servidor respondió 401 al revocar (el token ya había vencido).
      set({ status: 'unauthenticated', user: null, lastActivityAt: 0, error: null, notice: null });
    },

    register: (input) => service.register(input),
    verifyEmail: (email) => service.verifyEmail(email),
    resendVerification: (email) => service.resendVerification(email),
    confirmEmail: (token) => service.confirmEmail(token),
    verifiesByEmailLink: service.verifiesByEmailLink,

    async expire(notice) {
      if (get().status !== 'authenticated') return;
      set({ status: 'unauthenticated', user: null, lastActivityAt: 0, notice });
      await service.logout();
    },

    async touch() {
      const { status, lastActivityAt } = get();
      if (status !== 'authenticated' || now() - lastActivityAt < AUTH.ACTIVITY_THROTTLE_MS) return;
      set({ lastActivityAt: await service.touch() });
    },

    async checkInactivity() {
      const { status, lastActivityAt } = get();
      if (status !== 'authenticated') return;
      if (now() - lastActivityAt > service.inactivityMs) {
        await service.logout();
        set({ status: 'unauthenticated', user: null, lastActivityAt: 0, notice: 'Tu sesión expiró por inactividad. Inicia sesión nuevamente.' });
      }
    },

    clearMessages: () => set({ error: null, notice: null }),
  }));
}

export type AuthStore = ReturnType<typeof createAuthStore>;
