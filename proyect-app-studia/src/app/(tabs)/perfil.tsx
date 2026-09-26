import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// Pantalla en blanco: pendiente de diseño.
export default function PerfilScreen() {
  const colors = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
