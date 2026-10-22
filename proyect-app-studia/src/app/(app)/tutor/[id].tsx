import { useLocalSearchParams } from 'expo-router';

import TutorPerfilScreen from '@/screens/tutor-perfil-screen';

export default function TutorRoute() {
  const { id, subject } = useLocalSearchParams<{ id: string; subject?: string }>();
  return <TutorPerfilScreen tutorId={id} subjectCode={subject} />;
}
