import { createStore } from 'zustand/vanilla';

import { STORAGE } from '@/constants/app-config';
import type { StorageService } from '@/services/storage-service';

export type ThemePreference = 'system' | 'light' | 'dark';

export type Preferences = {
  theme: ThemePreference;
  notificationsEnabled: boolean;
  /** Último modo con el que el usuario usó la app (solo se respeta si tiene rol Tutor). */
  tutorMode: boolean;
};

export type PreferencesState = Preferences & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemePreference) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTutorMode: (enabled: boolean) => void;
  reset: () => void;
};

export const DEFAULT_PREFERENCES: Preferences = { theme: 'system', notificationsEnabled: true, tutorMode: false };

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

/** Acepta solo valores válidos: si el dato guardado está corrupto o es de otra versión, se usa el valor por defecto. */
export function sanitizePreferences(raw: unknown): Preferences {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Preferences, unknown>>;
  return {
    theme: THEMES.includes(data.theme as ThemePreference) ? (data.theme as ThemePreference) : DEFAULT_PREFERENCES.theme,
    notificationsEnabled: typeof data.notificationsEnabled === 'boolean' ? data.notificationsEnabled : DEFAULT_PREFERENCES.notificationsEnabled,
    tutorMode: typeof data.tutorMode === 'boolean' ? data.tutorMode : DEFAULT_PREFERENCES.tutorMode,
  };
}

/** Preferencias del usuario, guardadas en AsyncStorage y cargadas al abrir la app. */
export function createPreferencesStore(storage: StorageService) {
  return createStore<PreferencesState>()((set, get) => {
    const persist = () => {
      const { theme, notificationsEnabled, tutorMode } = get();
      void storage.setJSON(STORAGE.KEYS.PREFERENCES, { theme, notificationsEnabled, tutorMode });
    };
    const update = (patch: Partial<Preferences>) => {
      set(patch);
      persist();
    };

    return {
      ...DEFAULT_PREFERENCES,
      hydrated: false,

      async hydrate() {
        const saved = await storage.getJSON<unknown>(STORAGE.KEYS.PREFERENCES);
        set({ ...sanitizePreferences(saved), hydrated: true });
      },

      setTheme: (theme) => update({ theme }),
      setNotificationsEnabled: (notificationsEnabled) => update({ notificationsEnabled }),
      setTutorMode: (tutorMode) => update({ tutorMode }),
      reset: () => update({ ...DEFAULT_PREFERENCES }),
    };
  });
}

export type PreferencesStore = ReturnType<typeof createPreferencesStore>;
