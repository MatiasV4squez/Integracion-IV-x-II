import type { CatalogoRepository } from '@/application/ports/repositories';
import type { Materia } from '@/domain/catalogo/materia';

import { api, SERVICIOS } from './http-client';

type MateriaApi = { idMateria: string; codigo: string; nombre: string };

const AREAS: Record<string, string> = { MAT: 'Matemáticas', INFO: 'Informática', FIS: 'Ciencias', QUI: 'Ciencias', EST: 'Matemáticas' };
const areaDe = (codigo: string) => AREAS[codigo.replace(/\d+$/, '')] ?? 'General';

/**
 * Adaptador del puerto CatalogoRepository: GET /materias-tutores/materias. Se pide una vez y se
 * reutiliza (lo necesitan la búsqueda y la traducción código <-> idMateria de las sesiones).
 */
export function createHttpCatalogoRepository(): CatalogoRepository {
  let catalogo: Promise<Materia[]> | null = null;
  return {
    listar() {
      catalogo ??= api.get<MateriaApi[]>(`${SERVICIOS.materias}/materias`).then(
        (lista) => lista.map((m) => ({ id: m.idMateria, code: m.codigo, name: m.nombre, area: areaDe(m.codigo), units: [] })),
        (error: unknown) => {
          catalogo = null; // Reintentar en la próxima llamada.
          throw error;
        },
      );
      return catalogo;
    },
  };
}

/** Materia del catálogo a partir de su código (los micros usan el idMateria). */
export async function materiaPorCodigo(catalogo: CatalogoRepository, code: string): Promise<Materia> {
  const materia = (await catalogo.listar()).find((m) => m.code === code);
  if (!materia) throw new Error(`La materia ${code} no existe en el catálogo.`);
  return materia;
}
