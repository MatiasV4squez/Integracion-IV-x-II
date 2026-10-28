import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { usePreferences } from '@/hooks/use-preferences';
import { useUI } from '@/hooks/use-ui';
import { canAccess } from '@/navigation/access';
import { SessionsProvider } from '@/state/sessions-context';
import { authStore, preferencesStore } from '@/store';

// La pantalla de carga se mantiene hasta recuperar la sesión y las preferencias guardadas.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { isHydrating } = useAuth();
  const prefsHydrated = usePreferences((state) => state.hydrated);
  const ready = !isHydrating && prefsHydrated;

  useEffect(() => {
    void Promise.all([preferencesStore.getState().hydrate(), authStore.getState().hydrate()]);
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SessionsProvider>
      <RootNavigator />
    </SessionsProvider>
  );
}

/** Registra actividad al navegar y revisa la inactividad al volver a la app (NFR04). */
function useSessionActivity() {
  const pathname = usePathname();

  useEffect(() => {
    void authStore.getState().touch();
  }, [pathname]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void authStore.getState().checkInactivity();
    });
    return () => subscription.remove();
  }, []);
}

function RootNavigator() {
  const { isAuthenticated, roles } = useAuth();
  const ui = useUI();
  const session = { isAuthenticated, roles };
  useSessionActivity();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Cualquier usuario con sesión */}
      <Stack.Protected guard={canAccess('authenticated', session)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="detalle-sesion" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Solo cuentas con rol Tutor */}
      <Stack.Protected guard={canAccess('tutor', session)}>
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
      </Stack.Protected>

      {/* Solo sin sesión */}
      <Stack.Protected guard={canAccess('public', session)}>
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
      </Stack.Protected>
    </Stack>
  );
}
