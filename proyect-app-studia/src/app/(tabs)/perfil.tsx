import { useTutorMode } from '@/hooks/use-tutor-mode';
import TuteeProfileScreen from '@/screens/tutee-profile-screen';
import TutorProfileScreen from '@/screens/tutor-profile';

export default function PerfilScreen() {
  const { isTutor } = useTutorMode();
  return isTutor ? <TutorProfileScreen /> : <TuteeProfileScreen />;
}
