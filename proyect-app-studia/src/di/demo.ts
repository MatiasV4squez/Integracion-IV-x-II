/**
 * Datos de ejemplo del modo demo (sin backend) que la interfaz necesita para simular el flujo:
 * el usuario demo, sus sesiones, el catálogo y los tutores de ejemplo. Con backend no se usan.
 */
export { ME, ME_AS_TUTOR, MOCK_NOW, MOCK_SESSIONS } from '@/infrastructure/demo/data/sessions';
export { getSubject, SUBJECTS } from '@/infrastructure/demo/data/subjects';
export { getTutorById, tutorsForSubject } from '@/infrastructure/demo/data/tutors';
