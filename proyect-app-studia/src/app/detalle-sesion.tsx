import { Stack, useLocalSearchParams } from 'expo-router';

import { getMockSessionById, MOCK_NOW } from '@/mocks/sessions';
import DetalleSesionScreen from '@/screens/detalle-sesion-screen';

export default function DetalleSesionRoute() {
  // Vista previa: /detalle-sesion?id=s3 (ids s1 a s13 en src/mocks/sessions.ts)
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Detalle de sesión' }} />
      <DetalleSesionScreen session={getMockSessionById(id)} now={MOCK_NOW} />
    </>
  );
}
