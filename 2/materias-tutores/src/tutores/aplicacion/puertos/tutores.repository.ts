import type { Paginacion } from '../modelos/paginacion.js';
import type { TutorResumen } from '../modelos/tutor-resumen.js';

export interface TutoresRepository {
  buscarHabilitadosPorMateria(idMateria: bigint, paginacion: Paginacion): Promise<{ items: TutorResumen[]; total: number }>;
}

export const TUTORES_REPOSITORY = Symbol('TUTORES_REPOSITORY');
