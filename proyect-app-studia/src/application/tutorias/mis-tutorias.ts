import type { MisTutoriasRepository, Tutoria } from '@/application/ports/repositories';

/** Casos de uso de "Mis tutorías" (pantalla de demostración de la vista de Tutor). */
export function createMisTutoriasUseCases(deps: { misTutorias: MisTutoriasRepository }) {
  return {
    listar: (signal?: AbortSignal): Promise<Tutoria[]> => deps.misTutorias.listar(signal),
    obtener: async (id: string | undefined, signal?: AbortSignal): Promise<Tutoria | undefined> => {
      if (!id) return undefined;
      const items = await deps.misTutorias.listar(signal);
      return items.find((t) => t.id === id);
    },
  };
}

export type MisTutoriasUseCases = ReturnType<typeof createMisTutoriasUseCases>;
