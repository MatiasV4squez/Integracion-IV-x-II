/** Lo mínimo que se necesita de un almacenamiento clave-valor (AsyncStorage y SecureStore lo cumplen). */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Almacenamiento JSON con caché con vencimiento. Nunca lanza errores (NFR12). */
export interface StorageService {
  getJSON<T>(key: string): Promise<T | null>;
  getJSON<T>(key: string, fallback: T): Promise<T>;
  setJSON(key: string, value: unknown): Promise<boolean>;
  remove(key: string): Promise<boolean>;
  cache: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlMs: number): Promise<boolean>;
    invalidate(key: string): Promise<boolean>;
  };
}

/** Guarda el token JWT (en el celular, en almacenamiento seguro: NFR16). */
export interface TokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}
