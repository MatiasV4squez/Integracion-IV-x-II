import { useStore } from 'zustand';

import { preferencesStore } from '@/store';
import type { PreferencesState } from '@/store/create-preferences-store';

/** Preferencias guardadas en el dispositivo (tema, notificaciones, modo tutor). */
export function usePreferences<T>(selector: (state: PreferencesState) => T): T {
  return useStore(preferencesStore, selector);
}
