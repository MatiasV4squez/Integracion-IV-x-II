import type { CatalogoRepository, DatosPublicos, TutoresRepository, UsuariosRepository } from '@/application/ports/repositories';
import type { AvailabilityBlock, Tutor } from '@/domain/sesiones/session';
import { santiagoToIso } from '@/shared/santiago-time';

import { materiaPorCodigo } from './catalogo-api';
import { api, SERVICIOS } from './http-client';

type BloqueApi = { idBloque: string; dia: string; horaInicio: string; horaFin: string };
type TutorApi = {
  idTutor: string;
  promedioCalificaciones: number | null;
  cantidadCalificaciones: number;
  horariosDisponibles: BloqueApi[];
};
type ReputacionApi = { idTutor: string; cantidadCalificaciones: number; promedio: number | null };

/** materias-tutores maneja bloques individuales (un cupo) en hora de Santiago. */
const aBloque = (b: BloqueApi): AvailabilityBlock => ({
  id: b.idBloque,
  startsAt: santiagoToIso(b.dia, b.horaInicio),
  endsAt: santiagoToIso(b.dia, b.horaFin),
  capacity: 1,
  enrolled: 0,
});

/**
 * Tutor de la app a partir de materias-tutores (reputación y horarios) y usuarios-auth (datos públicos).
 * Las estadísticas, reseñas y materias dictadas aún no las expone ningún micro: quedan vacías.
 */
const aTutor = (
  t: { id: string; reputation: number | null; ratingsCount: number; subjectCodes: string[]; availability: AvailabilityBlock[] },
  datos: DatosPublicos | undefined,
): Tutor => ({
  ...t,
  name: datos?.nombre ?? `Tutor #${t.id}`,
  career: datos?.carrera ?? '',
  semester: datos?.semestre_actual ?? 0,
  bio: datos?.biografia ?? '',
  verified: true,
  stats: { sessions: 0, hours: 0, responseTime: '—', repeatRate: 0 },
  bySubject: [],
  recent: [],
  reviews: [],
});

/** Adaptador del puerto TutoresRepository: búsqueda, reputación y horarios en materias-tutores; datos públicos en usuarios-auth. */
export function createHttpTutoresRepository(deps: { catalogo: CatalogoRepository; usuarios: UsuariosRepository }): TutoresRepository {
  return {
    /** GET /tutores?materiaId=&page=&limit= — tutores (con horarios) que enseñan una materia. */
    async buscarPorMateria(params, signal) {
      const materia = await materiaPorCodigo(deps.catalogo, params.subjectCode);
      const res = await api.get<{ items: TutorApi[]; total: number; page: number; limit: number; totalPages: number }>(
        `${SERVICIOS.materias}/tutores`,
        { materiaId: materia.id, page: params.page, limit: params.pageSize },
        signal,
      );
      const personas = await deps.usuarios.datosPublicos(res.items.map((t) => t.idTutor), signal);
      return {
        items: res.items.map((t) =>
          aTutor(
            {
              id: t.idTutor,
              reputation: t.promedioCalificaciones,
              ratingsCount: t.cantidadCalificaciones,
              subjectCodes: [params.subjectCode],
              availability: t.horariosDisponibles.map(aBloque),
            },
            personas.get(t.idTutor),
          ),
        ),
        page: res.page,
        pageSize: res.limit,
        total: res.total,
        hasMore: res.page < res.totalPages,
      };
    },

    /** Perfil público de un tutor: reputación + disponibilidad + datos públicos. */
    async obtener(id, signal) {
      const path = encodeURIComponent(id);
      const [reputacion, bloques, personas] = await Promise.all([
        api.get<ReputacionApi>(`${SERVICIOS.materias}/tutores/${path}/reputacion`, undefined, signal),
        api.get<BloqueApi[]>(`${SERVICIOS.materias}/disponibilidad/tutores/${path}`, undefined, signal),
        deps.usuarios.datosPublicos([id], signal),
      ]);
      return aTutor(
        { id, reputation: reputacion.promedio, ratingsCount: reputacion.cantidadCalificaciones, subjectCodes: [], availability: bloques.map(aBloque) },
        personas.get(id),
      );
    },
  };
}
