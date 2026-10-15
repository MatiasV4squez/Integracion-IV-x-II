import type { Materia } from '../../dominio/materia.js';

export interface MateriasRepository {
  // Devuelve el catálogo ordenado ascendentemente por código.
  listarCatalogo(): Promise<Materia[]>;
}

export const MATERIAS_REPOSITORY = Symbol('MATERIAS_REPOSITORY');
