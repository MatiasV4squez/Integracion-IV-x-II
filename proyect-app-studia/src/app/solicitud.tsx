import { Stack, useLocalSearchParams } from 'expo-router';

import { MOCK_PENDING_COUNT } from '@/mocks/sessions';
import SolicitudScreen from '@/screens/solicitud-screen';

export default function SolicitudRoute() {
  // Vista previa: /solicitud?pendientes=4 para ver el límite alcanzado (BR05)
  const { pendientes } = useLocalSearchParams<{ pendientes?: string }>();
  const parsed = Number(pendientes);
  const pendingCount = pendientes !== undefined && Number.isInteger(parsed) && parsed >= 0 ? parsed : MOCK_PENDING_COUNT;

  return (
    <>
      <Stack.Screen options={{ title: 'Solicitar tutoría' }} />
      <SolicitudScreen pendingCount={pendingCount} />
    </>
  );
}
