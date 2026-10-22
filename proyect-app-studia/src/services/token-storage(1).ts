import { STORAGE } from '@/constants/app-config';
import type { KeyValueStorage } from '@/services/storage-service';

/** Guarda el token JWT. En el celular usa almacenamiento seguro (NFR16); ver `adapters/secure-store.ts`. */
export interface TokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

export function createTokenStorage(adapter: KeyValueStorage, key: string = STORAGE.TOKEN_KEY): TokenStorage {
  return {
    async get() {
      try {
        return await adapter.getItem(key);
      } catch {
        return null;
      }
    },
    async set(token) {
      await adapter.setItem(key, token);
    },
    async clear() {
      try {
        await adapter.removeItem(key);
      } catch {
        // si no se puede borrar, el token igual queda inválido al expirar
      }
    },
  };
}
