import { useLocalSearchParams } from 'expo-router';

import SolicitudScreen from '@/screens/solicitud-screen';

export default function SolicitudRoute() {
  // Ejemplo: /solicitud?subject=MAT1010&tutor=t1 abre el flujo con materia y tutor elegidos
  const { subject, tutor } = useLocalSearchParams<{ subject?: string; tutor?: string }>();
  return <SolicitudScreen initialSubject={subject} initialTutor={tutor} />;
}
