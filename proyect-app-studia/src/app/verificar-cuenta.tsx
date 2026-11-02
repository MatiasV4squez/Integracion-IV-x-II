import { useLocalSearchParams } from 'expo-router';

import VerificarCuentaScreen from '@/presentation/screens/verificar-cuenta-screen';

export default function VerificarCuentaRoute() {
  // El enlace del correo llega como /verificar-cuenta?token=...
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <VerificarCuentaScreen token={token} />;
}
