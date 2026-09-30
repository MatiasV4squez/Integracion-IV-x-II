import { Stack } from 'expo-router';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { TutorModeProvider } from '@/hooks/use-tutor-mode';
import { useUI } from '@/hooks/use-ui';
import { SessionsProvider } from '@/state/sessions-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated } = useAuth();
  const ui = useUI();

  return (
    <TutorModeProvider>
      <SessionsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="tutor" options={{ headerShown: false }} />
            <Stack.Screen
              name="publicar-disponibilidad"
              options={{
                headerShown: true,
                title: 'Publicar disponibilidad',
                headerStyle: { backgroundColor: ui.navy },
                headerTintColor: '#FFFFFF',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen name="detalle-sesion" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      </SessionsProvider>
    </TutorModeProvider>
  );
}
