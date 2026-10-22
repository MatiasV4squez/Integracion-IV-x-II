/**
 * Punto único donde se arman los servicios reales de la app (adaptadores de almacenamiento + origen de datos).
 * Las pantallas y los hooks importan desde aquí; las pruebas importan las fábricas (`create...`) directamente.
 */
import { STORAGE } from '@/constants/app-config';
import { SUBJECTS } from '@/mocks/subjects';
import { asyncStorageAdapter } from '@/services/adapters/async-storage';
import { secureStoreAdapter } from '@/services/adapters/secure-store';
import { createAuthService } from '@/services/auth-service';
import { createMockAuthGateway } from '@/services/auth-gateway';
import { createCatalogService } from '@/services/catalog-service';
import { createStorageService } from '@/services/storage-service';
import { createTokenStorage } from '@/services/token-storage';

const MOCK_LATENCY_MS = 400;

export const storage = createStorageService(asyncStorageAdapter, { prefix: STORAGE.PREFIX });
export const tokenStorage = createTokenStorage(secureStoreAdapter);

export const authService = createAuthService({
  gateway: createMockAuthGateway({ latencyMs: MOCK_LATENCY_MS }),
  tokenStorage,
  storage,
});

export const catalogService = createCatalogService({
  storage,
  fetchSubjects: async () => {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return SUBJECTS;
  },
});
