import type { Person } from '@/domain/sesiones/session';

/** Datos del usuario autenticado que muestra su perfil. */
export type Perfil = Person & {
  university: string;
  career: string;
  year: string;
  gpa: string;
  /** Reputación como Tutor (null si aún no tiene calificaciones). */
  reputation: number | null;
  ratingsCount: number;
};
