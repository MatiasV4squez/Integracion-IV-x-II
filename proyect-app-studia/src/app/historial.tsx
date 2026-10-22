import { Stack } from 'expo-router';

import HistorialScreen from '@/screens/historial-screen';

export default function HistorialRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Historial' }} />
      <HistorialScreen />
    </>
  );
}
