import { UI, type UIColors } from '@/constants/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Paleta del rediseño según el modo claro/oscuro. */
export function useUI(): UIColors {
  const scheme = useColorScheme();
  return UI[scheme === 'dark' ? 'dark' : 'light'];
}
