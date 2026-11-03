import { canBeTutor } from '@/presentation/navigation/access';
import { useAuthStore } from '@/presentation/hooks/use-auth';
import { usePreferences } from '@/presentation/hooks/use-preferences';
import { preferencesStore } from '@/di/container';

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
