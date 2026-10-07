import type { Paginacion } from '../models/paginacion.js';
import type { TutorResumen } from '../models/tutor-resumen.js';

export interface TutoresRepository {
  buscarHabilitadosPorMateria(idMateria: bigint, paginacion: Paginacion): Promise<{ items: TutorResumen[]; total: number }>;
}

export const TUTORES_REPOSITORY = Symbol('TUTORES_REPOSITORY');
