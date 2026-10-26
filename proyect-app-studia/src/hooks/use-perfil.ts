import { fetchPerfil } from '@/api/perfil';
import { useAsync } from '@/hooks/use-async';

/** Datos del usuario autenticado (académicos y reputación). */
export function usePerfil() {
  return useAsync('perfil', fetchPerfil);
}
