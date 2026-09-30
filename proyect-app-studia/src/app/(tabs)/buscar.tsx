import { useLocalSearchParams } from 'expo-router';

import TutoriasDisponiblesScreen from '@/screens/tutorias-disponibles-screen';

export default function BuscarRoute() {
  const { subject, tutor } = useLocalSearchParams<{ subject?: string; tutor?: string }>();
  return <TutoriasDisponiblesScreen initialSubject={subject} initialTutor={tutor} />;
}
