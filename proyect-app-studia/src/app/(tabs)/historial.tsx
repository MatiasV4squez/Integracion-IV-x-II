import { useTutorMode } from '@/hooks/use-tutor-mode';
import HistorialScreen from '@/screens/historial-screen';
import HistorialTuteeScreen from '@/screens/historial-tutee-screen';

export default function HistorialRoute() {
  const { isTutor } = useTutorMode();
  return isTutor ? <HistorialScreen /> : <HistorialTuteeScreen />;
}
