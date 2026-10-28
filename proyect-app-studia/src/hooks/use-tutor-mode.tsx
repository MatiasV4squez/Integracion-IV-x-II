import { canBeTutor } from '@/navigation/access';
import { useAuthStore } from '@/hooks/use-auth';
import { usePreferences } from '@/hooks/use-preferences';
import { preferencesStore } from '@/store';

/**
 * Modo Tutor. Misma interfaz que antes (`isTutor`, `setIsTutor`) pero ahora se guarda en el dispositivo
 * y solo se puede activar si la cuenta tiene el rol Tutor.
 */
export function useTutorMode() {
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  const tutorMode = usePreferences((state) => state.tutorMode);
  const allowed = canBeTutor(roles);

  return {
    /** Tiene el rol Tutor (puede alternar de modo). */
    canBeTutor: allowed,
    isTutor: allowed && tutorMode,
    setIsTutor: (value: boolean) => {
      if (value && !allowed) return;
      preferencesStore.getState().setTutorMode(value);
    },
  };
}
