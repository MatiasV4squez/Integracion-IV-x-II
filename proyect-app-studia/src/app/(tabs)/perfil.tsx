import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useTutorMode } from '@/hooks/use-tutor-mode';
import TutorProfileScreen from '@/screens/tutor-profile';

// Pantalla de estudiante en blanco: pendiente de diseño.
export default function PerfilScreen() {
  const colors = useTheme();
  const { isTutor } = useTutorMode();

  if (isTutor) {
    return <TutorProfileScreen />;
  }

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
