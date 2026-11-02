import { useStore } from 'zustand';

import { preferencesStore } from '@/di/container';
import type { PreferencesState } from '@/presentation/state/preferences-store';

/** Preferencias guardadas en el dispositivo (tema, notificaciones, modo tutor). */
export function usePreferences<T>(selector: (state: PreferencesState) => T): T {
  return useStore(preferencesStore, selector);
}
