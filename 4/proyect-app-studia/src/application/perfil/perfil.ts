import type { PerfilRepository } from '@/application/ports/repositories';
import type { User } from '@/domain/auth/auth';

/** Caso de uso del perfil del usuario autenticado (datos académicos y reputación). */
export function createPerfilUseCases(deps: { perfil: PerfilRepository }) {
  return { obtener: (user: User, signal?: AbortSignal) => deps.perfil.obtener(user, signal) };
}

export type PerfilUseCases = ReturnType<typeof createPerfilUseCases>;
