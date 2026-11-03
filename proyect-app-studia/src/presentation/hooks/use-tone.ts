import { TONES, type Tone } from '@/presentation/constants/tones';
import { useColorScheme } from '@/presentation/hooks/use-color-scheme';

/** Devuelve { bg, fg } del tono pedido según el modo claro/oscuro. */
export function useTone(tone: Tone) {
  const scheme = useColorScheme();
  return TONES[scheme === 'dark' ? 'dark' : 'light'][tone];
}
