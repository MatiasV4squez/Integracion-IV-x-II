import { useState } from 'react';

import { isApiEnabled } from '@/api/client';
import { fetchTutor, fetchTutores, postSolicitud, type SolicitudInput } from '@/api/tutorias';
import { useAsync } from '@/hooks/use-async';
import { usePaginated } from '@/hooks/use-paginated';
import { ME } from '@/mocks/sessions';
import { useSessions } from '@/state/sessions-context';
import { createRequest } from '@/utils/session-machine';

export const TUTORES_PAGE_SIZE = 5;

/** Tutores (con sus horarios) que enseñan una materia, paginados. `null` = sin materia elegida. */
export function useTutorias(subjectCode: string | null, pageSize = TUTORES_PAGE_SIZE) {
  return usePaginated(subjectCode ? `tutores:${subjectCode}:${pageSize}` : null, (page, signal) =>
    fetchTutores({ subjectCode: subjectCode ?? '', page, pageSize }, signal),
  );
}

/** Perfil público (detalle) de un tutor. */
export function useTutoria(tutorId: string | undefined) {
  return useAsync(tutorId ? `tutor:${tutorId}` : null, (signal) => fetchTutor(tutorId ?? '', signal));
}

export type SolicitudResult = { ok: true; sessionId: string } | { ok: false; error: string };

/**
 * Solicitar (reservar) un horario de tutoría. Sin backend aplica las reglas de session-machine
 * sobre SessionsProvider; con backend hace POST /sesiones.
 */
export function useSolicitarTutoria() {
  const { run } = useSessions();
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);

  const solicitar = async (input: SolicitudInput): Promise<SolicitudResult> => {
    if (!isApiEnabled()) {
      const res = run((state) => createRequest(state, { ...input, me: ME }));
      return res.ok ? { ok: true, sessionId: res.session.id } : { ok: false, error: res.error };
    }
    setPendingBlockId(input.block.id);
    try {
      const session = await postSolicitud(input);
      return { ok: true, sessionId: session.id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'No se pudo enviar la solicitud.' };
    } finally {
      setPendingBlockId(null);
    }
  };

  return { solicitar, pendingBlockId };
}
