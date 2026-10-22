import { CACHE_TTL_MS } from '@/constants/app-config';
import type { StorageService } from '@/services/storage-service';
import type { SubjectDetail } from '@/types/session';

export type CatalogServiceDeps = {
  storage: StorageService;
  /** Origen de los datos (hoy un mock; mañana el API Gateway). */
  fetchSubjects: () => Promise<SubjectDetail[]>;
  ttlMs?: number;
};

const CACHE_KEY = 'subjects';

/** Catálogo de materias con caché local: se consulta al origen solo cuando la caché venció (NFR12). */
export function createCatalogService({ storage, fetchSubjects, ttlMs = CACHE_TTL_MS.CATALOG }: CatalogServiceDeps) {
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
