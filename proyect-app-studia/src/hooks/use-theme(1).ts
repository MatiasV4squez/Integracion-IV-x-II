import { useColorScheme } from '@/hooks/use-color-scheme';

import { Colors } from '@/constants/theme';

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
