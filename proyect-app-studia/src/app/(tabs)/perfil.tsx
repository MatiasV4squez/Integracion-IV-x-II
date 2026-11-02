import { useTutorMode } from '@/presentation/hooks/use-tutor-mode';
import TuteeProfileScreen from '@/presentation/screens/tutee-profile-screen';
import TutorProfileScreen from '@/presentation/screens/tutor-profile';

export default function PerfilScreen() {
  const { isTutor } = useTutorMode();
  return isTutor ? <TutorProfileScreen /> : <TuteeProfileScreen />;
}
