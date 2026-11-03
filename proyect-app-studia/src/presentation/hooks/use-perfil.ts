import { useCases } from '@/di/container';
import { useAsync } from '@/presentation/hooks/use-async';
import { useAuthStore } from '@/presentation/hooks/use-auth';

/** Datos del usuario autenticado (académicos y reputación). Se vuelven a pedir si cambia el usuario. */
export function usePerfil() {
  const user = useAuthStore((state) => state.user);
  return useAsync(user ? `perfil:${user.id}` : null, (signal) => useCases.perfil.obtener(user!, signal));
}
