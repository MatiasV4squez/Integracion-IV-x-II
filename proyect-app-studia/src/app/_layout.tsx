import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/presentation/hooks/use-auth';
import { usePreferences } from '@/presentation/hooks/use-preferences';
import { useUI } from '@/presentation/hooks/use-ui';
import { canAccess } from '@/presentation/navigation/access';
import { SessionsProvider } from '@/presentation/state/sessions-context';
import { authStore, preferencesStore } from '@/di/container';

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
  // Encabezado como el de la web: blanco, título oscuro y acciones en azul.
  const headerOptions = {
    headerShown: true,
    headerStyle: { backgroundColor: ui.surface },
    headerTintColor: ui.primaryText,
    headerTitleStyle: { color: ui.text, fontWeight: '700' as const },
    headerShadowVisible: true,
  };
  useSessionActivity();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Cualquier usuario con sesión */}
      <Stack.Protected guard={canAccess('authenticated', session)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="detalle-sesion" options={{ headerShown: false }} />
        <Stack.Screen name="postulacion-tutor" options={{ ...headerOptions, title: 'Ser tutor' }} />
      </Stack.Protected>

      {/* Solo administradores */}
      <Stack.Protected guard={canAccess('admin', session)}>
        <Stack.Screen name="admin/postulaciones" options={{ ...headerOptions, title: 'Administración' }} />
      </Stack.Protected>

      {/* Solo cuentas con rol Tutor */}
      <Stack.Protected guard={canAccess('tutor', session)}>
        <Stack.Screen name="tutor" options={{ headerShown: false }} />
        <Stack.Screen name="publicar-disponibilidad" options={{ ...headerOptions, title: 'Publicar disponibilidad' }} />
      </Stack.Protected>

      {/* Solo sin sesión */}
      <Stack.Protected guard={canAccess('public', session)}>
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
      </Stack.Protected>

      {/* Con o sin sesión: se abre desde el enlace del correo */}
      <Stack.Screen name="verificar-cuenta" />
    </Stack>
  );
}
