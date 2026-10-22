import { useLocalSearchParams } from 'expo-router';

import DetalleSesionScreen from '@/screens/detalle-sesion-screen';

export default function DetalleSesionRoute() {
  // Ejemplo: /detalle-sesion?id=s3 (ids s1 a s14 en src/mocks/sessions.ts)
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <DetalleSesionScreen sessionId={id} />;
}
