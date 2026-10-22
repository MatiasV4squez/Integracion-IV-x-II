import { useColorScheme as useSystemColorScheme } from 'react-native';

import { usePreferences } from '@/hooks/use-preferences';

/** Tema de la app: respeta la preferencia guardada ("claro", "oscuro") o sigue al sistema. */
export function useColorScheme() {
  const preference = usePreferences((state) => state.theme);
  const system = useSystemColorScheme();
  return preference === 'system' ? system : preference;
}
