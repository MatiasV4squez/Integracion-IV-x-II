import { UI, type UIColors } from '@/presentation/constants/ui';
import { useColorScheme } from '@/presentation/hooks/use-color-scheme';

/** Paleta del rediseño según el modo claro/oscuro. */
export function useUI(): UIColors {
  const scheme = useColorScheme();
  return UI[scheme === 'dark' ? 'dark' : 'light'];
}
