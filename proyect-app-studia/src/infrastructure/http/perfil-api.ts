import type { PerfilRepository, UsuariosRepository } from '@/application/ports/repositories';
import { isTutor } from '@/domain/auth/auth';
import { AppError } from '@/shared/errors';

import { api, SERVICIOS } from './http-client';

/**
 * Adaptador del puerto PerfilRepository: nombre, carrera y semestre de usuarios-auth, y reputación de
 * materias-tutores si es tutor. El promedio de notas (gpa) no lo expone ningún micro.
 */
export function createHttpPerfilRepository(deps: { usuarios: UsuariosRepository }): PerfilRepository {
  return {
    async obtener(user, signal) {
      const datos = (await deps.usuarios.datosPublicos([user.id], signal)).get(user.id);
      let reputation: number | null = null;
      let ratingsCount = 0;
      if (isTutor(user)) {
        try {
          const rep = await api.get<{ promedio: number | null; cantidadCalificaciones: number }>(
            `${SERVICIOS.materias}/tutores/${encodeURIComponent(user.id)}/reputacion`,
            undefined,
            signal,
          );
          reputation = rep.promedio;
          ratingsCount = rep.cantidadCalificaciones;
        } catch (error) {
          // 404: tutor aún no habilitado en materias-tutores.
          if (!(error instanceof AppError && error.status === 404)) throw error;
        }
      }
      return {
        id: user.id,
        name: datos?.nombre ?? user.name,
        university: 'UCT',
        career: datos?.carrera ?? '—',
        year: datos?.semestre_actual ? `${datos.semestre_actual}° semestre` : '—',
        gpa: '—',
        reputation,
        ratingsCount,
      };
    },
  };
}
