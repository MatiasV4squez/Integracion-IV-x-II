import { Stack } from 'expo-router';

import { useTheme } from '@/presentation/hooks/use-theme';

export default function TutorStackLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: true,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="mis-tutorias" options={{ title: 'Mis tutorías' }} />
      <Stack.Screen name="tutoria/[id]" options={{ title: 'Detalle de tutoría' }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
