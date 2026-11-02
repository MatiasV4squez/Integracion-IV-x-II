import { STORAGE } from '@/shared/app-config';
import type { KeyValueStorage, TokenStorage } from '@/application/ports/storage';

/** Adaptador del puerto TokenStorage sobre un almacenamiento clave-valor (SecureStore en el celular). */
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
