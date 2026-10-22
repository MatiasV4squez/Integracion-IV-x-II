import { Stack } from 'expo-router';
import { View } from 'react-native';

import { TopNavbar } from '@/components/top-navbar';
import { useUI } from '@/hooks/use-ui';
import { SessionsProvider } from '@/state/sessions-context';

/** Layout de las pantallas de tutorías: estado compartido + barra de navegación superior. */
export default function AppLayout() {
  const ui = useUI();

  return (
    <SessionsProvider>
      <View style={{ flex: 1, backgroundColor: ui.bg }}>
        <TopNavbar />
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: ui.bg } }} />
      </View>
    </SessionsProvider>
  );
}
