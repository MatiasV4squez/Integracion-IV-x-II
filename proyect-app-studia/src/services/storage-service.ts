import { STORAGE } from '@/constants/app-config';

/** Lo mínimo que se necesita de un almacenamiento (AsyncStorage lo cumple tal cual). */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Almacenamiento en memoria: se usa en pruebas y como respaldo si el real falla. */
export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { dump(): Record<string, string> } {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    async getItem(key) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
    dump: () => Object.fromEntries(data),
  };
}

type CacheEntry<T> = { value: T; expiresAt: number };

export type StorageServiceOptions = {
  /** Texto que se antepone a todas las claves (por ejemplo "studia:v1:"). */
  prefix?: string;
  /** Reloj inyectable para probar la expiración de la caché. */
  now?: () => number;
};

/**
 * Guarda y lee JSON sobre un almacenamiento clave-valor. Nunca lanza: si el almacenamiento falla,
 * `getJSON` devuelve el valor por defecto y `setJSON`/`remove` devuelven false (la app debe seguir funcionando).
 */
export function createStorageService(adapter: KeyValueStorage, options: StorageServiceOptions = {}) {
  const prefix = options.prefix ?? '';
  const now = options.now ?? Date.now;
  const keyOf = (key: string) => prefix + key;

  async function getJSON<T>(key: string): Promise<T | null>;
  async function getJSON<T>(key: string, fallback: T): Promise<T>;
  async function getJSON<T>(key: string, fallback: T | null = null): Promise<T | null> {
    try {
      const raw = await adapter.getItem(keyOf(key));
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  async function setJSON(key: string, value: unknown): Promise<boolean> {
    try {
      await adapter.setItem(keyOf(key), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  async function remove(key: string): Promise<boolean> {
    try {
      await adapter.removeItem(keyOf(key));
      return true;
    } catch {
      return false;
    }
  }

  /** Caché con vencimiento para datos que cambian poco, como el catálogo de materias (NFR12). */
  const cache = {
    async get<T>(key: string): Promise<T | null> {
      const entry = await getJSON<CacheEntry<T>>(`cache:${key}`);
      if (!entry || typeof entry.expiresAt !== 'number') return null;
      if (entry.expiresAt <= now()) {
        await remove(`cache:${key}`);
        return null;
      }
      return entry.value;
    },
    async set<T>(key: string, value: T, ttlMs: number): Promise<boolean> {
      return setJSON(`cache:${key}`, { value, expiresAt: now() + ttlMs } satisfies CacheEntry<T>);
    },
    async invalidate(key: string): Promise<boolean> {
      return remove(`cache:${key}`);
    },
  };

  return { getJSON, setJSON, remove, cache };
}

export type StorageService = ReturnType<typeof createStorageService>;

export const DEFAULT_STORAGE_PREFIX = STORAGE.PREFIX;
