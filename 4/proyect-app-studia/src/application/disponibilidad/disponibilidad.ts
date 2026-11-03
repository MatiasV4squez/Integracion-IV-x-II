import type { BloqueHorario, DisponibilidadRepository } from '@/application/ports/repositories';

import type { ActionResult } from '@/application/sesiones/sesiones';

/** Horario que arma la pantalla (ISO con el offset de Chile, p. ej. "2026-11-12T09:15:00-03:00"). */
export type HorarioInput = { startsAt: string; endsAt: string };

/** ISO local de Chile → bloque de materias-tutores (día y horas locales). */
export const aBloque = ({ startsAt, endsAt }: HorarioInput): BloqueHorario => ({
  dia: startsAt.slice(0, 10),
  horaInicio: startsAt.slice(11, 16),
  horaFin: endsAt.slice(11, 16),
});

const validar = (input: HorarioInput): string | null =>
  new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime() ? 'La hora de término debe ser posterior al inicio.' : null;

/** Casos de uso de la disponibilidad del tutor con backend (materias-tutores). */
export function createDisponibilidadUseCases(deps: { disponibilidad: DisponibilidadRepository }) {
  const run = async (input: HorarioInput | null, op: () => Promise<void>): Promise<ActionResult> => {
    const problema = input ? validar(input) : null;
    if (problema) return { ok: false, error: problema };
    try {
      await op();
      return { ok: true, data: undefined };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'No se pudo guardar el horario.' };
    }
  };

  return {
    misBloques: (signal?: AbortSignal) => deps.disponibilidad.misBloques(signal),
    publicar: (input: HorarioInput) => run(input, () => deps.disponibilidad.publicar(aBloque(input))),
    actualizar: (id: string, input: HorarioInput) => run(input, () => deps.disponibilidad.actualizar(id, aBloque(input))),
    quitar: (id: string) => run(null, () => deps.disponibilidad.desactivar(id)),
  };
}

export type DisponibilidadUseCases = ReturnType<typeof createDisponibilidadUseCases>;
