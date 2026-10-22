/** Instancias únicas del estado global de la app (se arman con los servicios reales). */
import { authService, storage } from '@/services';
import { createAuthStore } from '@/store/create-auth-store';
import { createPreferencesStore } from '@/store/create-preferences-store';

export const authStore = createAuthStore(authService);
export const preferencesStore = createPreferencesStore(storage);
