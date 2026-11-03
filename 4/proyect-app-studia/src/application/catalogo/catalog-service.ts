import { CACHE_TTL_MS } from '@/shared/app-config';
import type { StorageService } from '@/application/ports/storage';
import type { SubjectDetail } from '@/domain/sesiones/session';

export type CatalogServiceDeps = {
  storage: StorageService;
  /** Origen de los datos (hoy un mock; mañana el API Gateway). */
  fetchSubjects: () => Promise<SubjectDetail[]>;
  ttlMs?: number;
  /** Clave de la caché; cambia según el origen para no mezclar el catálogo demo con el real. */
  cacheKey?: string;
};

/** Catálogo de materias con caché local: se consulta al origen solo cuando la caché venció (NFR12). */
export function createCatalogService({ storage, fetchSubjects, ttlMs = CACHE_TTL_MS.CATALOG, cacheKey: CACHE_KEY = 'subjects' }: CatalogServiceDeps) {
  async function getSubjects(): Promise<{ data: SubjectDetail[]; fromCache: boolean }> {
    const cached = await storage.cache.get<SubjectDetail[]>(CACHE_KEY);
    if (cached) return { data: cached, fromCache: true };
    const data = await fetchSubjects();
    await storage.cache.set(CACHE_KEY, data, ttlMs);
    return { data, fromCache: false };
  }

  async function refresh(): Promise<SubjectDetail[]> {
    await storage.cache.invalidate(CACHE_KEY);
    return (await getSubjects()).data;
  }

  return { getSubjects, refresh };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
