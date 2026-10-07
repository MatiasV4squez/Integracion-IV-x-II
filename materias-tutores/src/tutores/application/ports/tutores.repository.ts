import type { TutorResumen } from '../models/tutor-resumen.js';

export interface TutoresRepository {
  buscarHabilitadosPorMateria(idMateria: bigint): Promise<TutorResumen[]>;
}

export const TUTORES_REPOSITORY = Symbol('TUTORES_REPOSITORY');
