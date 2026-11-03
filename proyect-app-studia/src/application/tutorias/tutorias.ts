import type { CatalogoRepository, TutoresRepository } from '@/application/ports/repositories';

/** Casos de uso de búsqueda: catálogo de materias y tutores (con sus horarios) de cada materia. */
export function createTutoriasUseCases(deps: { catalogo: CatalogoRepository; tutores: TutoresRepository }) {
  return {
    listarMaterias: (signal?: AbortSignal) => deps.catalogo.listar(signal),
    buscarTutores: (params: { subjectCode: string; page: number; pageSize: number }, signal?: AbortSignal) =>
      deps.tutores.buscarPorMateria(params, signal),
    verTutor: (id: string, signal?: AbortSignal) => deps.tutores.obtener(id, signal),
  };
}

export type TutoriasUseCases = ReturnType<typeof createTutoriasUseCases>;
