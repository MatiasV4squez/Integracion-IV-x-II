import { useTutorMode } from '@/presentation/hooks/use-tutor-mode';
import MiHistorialScreen from '@/presentation/screens/mi-historial-screen';

/** El historial respeta el modo: como Tutee muestra lo que solicitó; como Tutor, lo que dicta. */
export default function HistorialRoute() {
  const { isTutor } = useTutorMode();
  return <MiHistorialScreen key={isTutor ? 'tutor' : 'tutee'} role={isTutor ? 'tutor' : 'tutee'} />;
}
