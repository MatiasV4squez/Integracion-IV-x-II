import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function TutorStackLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="mis-tutorias" options={{ title: 'Mis tutorías' }} />
      <Stack.Screen name="solicitud" options={{ title: 'Hacer una solicitud' }} />
      <Stack.Screen name="tutoria/[id]" options={{ title: 'Detalle de tutoría' }} />
    </Stack>
  );
}
