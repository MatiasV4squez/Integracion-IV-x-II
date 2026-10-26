import { getTutorById, tutorsForSubject } from '@/mocks/tutors';
import type { AvailabilityBlock, Session, Subject, Tutor } from '@/types/session';

import { api, ApiError, isApiEnabled, mockResponse, paginate, type Page } from './client';

/** GET /tutores?materia=&page=&pageSize= — tutores (con horarios) que enseñan una materia. */
export function fetchTutores(params: { subjectCode: string; page: number; pageSize: number }, signal?: AbortSignal) {
  if (isApiEnabled()) {
    return api.get<Page<Tutor>>('/tutores', { materia: params.subjectCode, page: params.page, pageSize: params.pageSize }, signal);
  }
  return mockResponse(() => paginate(tutorsForSubject(params.subjectCode), params.page, params.pageSize), signal);
}

/** GET /tutores/:id — perfil público de un tutor. */
export function fetchTutor(id: string, signal?: AbortSignal) {
  if (isApiEnabled()) return api.get<Tutor>(`/tutores/${encodeURIComponent(id)}`, undefined, signal);
  return mockResponse(() => {
    const tutor = getTutorById(id);
    if (!tutor) throw new ApiError('No encontramos a este tutor.', 404, 'NOT_FOUND');
    return tutor;
  }, signal);
}

export type SolicitudInput = {
  tutor: Pick<Tutor, 'id' | 'name' | 'reputation' | 'ratingsCount'>;
  subject: Subject;
  block: AvailabilityBlock;
  unit?: string;
  note?: string;
};

/** POST /sesiones — crea la solicitud (sesión en estado "pendiente"). Solo modo API. */
export function postSolicitud(input: SolicitudInput, signal?: AbortSignal) {
  return api.post<Session>(
    '/sesiones',
    { tutorId: input.tutor.id, materia: input.subject.code, bloqueId: input.block.id, unidad: input.unit, nota: input.note },
    signal,
  );
}
