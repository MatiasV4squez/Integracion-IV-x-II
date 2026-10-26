import { ME, ME_AS_TUTOR, ME_PROFILE } from '@/mocks/sessions';
import type { Person } from '@/types/session';

import { api, isApiEnabled, mockResponse } from './client';

export type Perfil = Person & {
  university: string;
  career: string;
  year: string;
  gpa: string;
  /** Reputación como Tutor (null si aún no tiene calificaciones). */
  reputation: number | null;
  ratingsCount: number;
};

/** GET /perfil — datos del usuario autenticado. */
export function fetchPerfil(signal?: AbortSignal) {
  if (isApiEnabled()) return api.get<Perfil>('/perfil', undefined, signal);
  return mockResponse<Perfil>(
    () => ({ ...ME, ...ME_PROFILE, reputation: ME_AS_TUTOR.reputation, ratingsCount: ME_AS_TUTOR.ratingsCount }),
    signal,
  );
}
