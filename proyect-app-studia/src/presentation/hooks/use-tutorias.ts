import { useState } from 'react';

import { isApiEnabled, useCases } from '@/di/container';
import { ME } from '@/di/demo';
import type { SolicitudInput } from '@/domain/sesiones/session';
import { createRequest } from '@/domain/sesiones/session-machine';
import { useAsync } from '@/presentation/hooks/use-async';
import { usePaginated } from '@/presentation/hooks/use-paginated';
import { useSessions } from '@/presentation/state/sessions-context';

export const TUTORES_PAGE_SIZE = 5;

/** Tutores (con sus horarios) que enseñan una materia, paginados. `null` = sin materia elegida. */
export function useTutorias(subjectCode: string | null, pageSize = TUTORES_PAGE_SIZE) {
  return usePaginated(subjectCode ? `tutores:${subjectCode}:${pageSize}` : null, (page, signal) =>
    useCases.tutorias.buscarTutores({ subjectCode: subjectCode ?? '', page, pageSize }, signal),
  );
}

/** Catálogo de materias (con backend, de materias-tutores; en la demo, de ejemplo). */
export function useMaterias() {
  return useAsync('materias', useCases.tutorias.listarMaterias);
}

/** Perfil público (detalle) de un tutor. */
export function useTutoria(tutorId: string | undefined) {
  return useAsync(tutorId ? `tutor:${tutorId}` : null, (signal) => useCases.tutorias.verTutor(tutorId ?? '', signal));
}

export type SolicitudResult = { ok: true; sessionId: string } | { ok: false; error: string };

/**
 * Solicitar (reservar) un horario de tutoría. Sin backend aplica las reglas de session-machine
 * sobre SessionsProvider; con backend usa el caso de uso de sesiones y recarga.
 */
export function useSolicitarTutoria() {
  const { run, reload } = useSessions();
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);

  const solicitar = async (input: SolicitudInput): Promise<SolicitudResult> => {
    if (!isApiEnabled()) {
      const res = run((state) => createRequest(state, { ...input, me: ME }));
      return res.ok ? { ok: true, sessionId: res.session.id } : { ok: false, error: res.error };
    }
    setPendingBlockId(input.block.id);
    const res = await useCases.sesiones.solicitar(input);
    if (res.ok) await reload();
    setPendingBlockId(null);
    return res.ok ? { ok: true, sessionId: res.data.id } : { ok: false, error: res.error };
  };

  return { solicitar, pendingBlockId };
}
