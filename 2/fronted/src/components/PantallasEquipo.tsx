import { lazy } from 'react';
import { RutaProtegida } from '../shared/auth/RutasAcceso';

const PostulacionTutorContainer = lazy(() => import('../features/postulaciones/containers/PostulacionTutorContainer'));

export default function PantallasEquipo() {
  return (
    <RutaProtegida>
      <PostulacionTutorContainer />
    </RutaProtegida>
  );
}
