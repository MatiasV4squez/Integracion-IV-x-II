import { useColorScheme } from '@/presentation/hooks/use-color-scheme';

import { Colors } from '@/presentation/constants/theme';

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
