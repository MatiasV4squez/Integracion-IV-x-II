/**
 * Raíz de composición (arquitectura hexagonal): el único lugar que conoce a la vez los puertos y sus
 * adaptadores. Con EXPO_PUBLIC_API_URL conecta los adaptadores HTTP (API Gateway); sin ella, los demo.
 * La presentación solo importa desde aquí (y desde `domain`/`shared`), nunca desde `infrastructure`.
 */
import { createAuthService } from '@/application/auth/auth-service';
import { createCatalogService } from '@/application/catalogo/catalog-service';
import { createDisponibilidadUseCases } from '@/application/disponibilidad/disponibilidad';
import { createPerfilUseCases } from '@/application/perfil/perfil';
import type { TokenStorage } from '@/application/ports/storage';
import { createPostulacionesUseCases } from '@/application/postulaciones/postulaciones';
import { createSesionesUseCases } from '@/application/sesiones/sesiones';
import { createTutoriasUseCases } from '@/application/tutorias/tutorias';
import {
  createDemoCatalogoRepository,
  createDemoPerfilRepository,
  createDemoPostulacionesRepository,
  createDemoTutoresRepository,
  createDemoUsuariosRepository,
} from '@/infrastructure/demo/demo-repositories';
import { createMockAuthGateway } from '@/infrastructure/demo/mock-auth-gateway';
import { createHttpCatalogoRepository } from '@/infrastructure/http/catalogo-api';
import { createHttpDisponibilidadRepository } from '@/infrastructure/http/disponibilidad-api';
import { createHttpAuthGateway } from '@/infrastructure/http/http-auth-gateway';
import { isApiEnabled as backendConfigurado, setAuthToken, setUnauthorizedHandler } from '@/infrastructure/http/http-client';
import { createHttpPerfilRepository } from '@/infrastructure/http/perfil-api';
import { createHttpPostulacionesRepository } from '@/infrastructure/http/postulaciones-api';
import { createHttpSesionesRepository } from '@/infrastructure/http/sesiones-api';
import { createHttpTutoresRepository } from '@/infrastructure/http/tutores-api';
import { createHttpUsuariosRepository } from '@/infrastructure/http/usuarios-auth-api';
import { asyncStorageAdapter } from '@/infrastructure/storage/async-storage';
import { secureStoreAdapter } from '@/infrastructure/storage/secure-store';
import { createStorageService } from '@/infrastructure/storage/storage-service';
import { createTokenStorage } from '@/infrastructure/storage/token-storage';
import { createAuthStore } from '@/presentation/state/auth-store';
import { createPreferencesStore } from '@/presentation/state/preferences-store';
import { STORAGE } from '@/shared/app-config';

const MOCK_LATENCY_MS = 400;
const backend = backendConfigurado();

/** true con backend (EXPO_PUBLIC_API_URL); false en el modo demo con datos de ejemplo. */
export const isApiEnabled = () => backend;

// --- Almacenamiento ---
export const storage = createStorageService(asyncStorageAdapter, { prefix: STORAGE.PREFIX });

/** El token guardado también se entrega al cliente HTTP, que lo envía en `Authorization: Bearer`. */
const secureTokens = createTokenStorage(secureStoreAdapter);
const tokenStorage: TokenStorage = {
  async get() {
    const token = await secureTokens.get();
    setAuthToken(token);
    return token;
  },
  async set(token) {
    setAuthToken(token);
    await secureTokens.set(token);
  },
  async clear() {
    setAuthToken(null);
    await secureTokens.clear();
  },
};

// --- Adaptadores de los puertos (backend o demo) ---
const usuarios = backend ? createHttpUsuariosRepository() : createDemoUsuariosRepository();
const catalogo = backend ? createHttpCatalogoRepository() : createDemoCatalogoRepository();
const tutores = backend ? createHttpTutoresRepository({ catalogo, usuarios }) : createDemoTutoresRepository();
const perfil = backend ? createHttpPerfilRepository({ usuarios }) : createDemoPerfilRepository();
const postulaciones = backend
  ? createHttpPostulacionesRepository()
  : createDemoPostulacionesRepository({ getUserId: () => authStore.getState().user?.id ?? '' });

// --- Casos de uso ---
export const authService = createAuthService({
  gateway: backend ? createHttpAuthGateway() : createMockAuthGateway({ latencyMs: MOCK_LATENCY_MS }),
  tokenStorage,
  storage,
});

export const catalogService = createCatalogService({
  storage,
  cacheKey: backend ? 'subjects:api' : 'subjects',
  fetchSubjects: () => catalogo.listar(),
});

export const useCases = {
  tutorias: createTutoriasUseCases({ catalogo, tutores }),
  // En la demo, las sesiones y la disponibilidad viven en el estado local (session-machine).
  sesiones: createSesionesUseCases({ sesiones: createHttpSesionesRepository({ catalogo, usuarios }) }),
  disponibilidad: createDisponibilidadUseCases({ disponibilidad: createHttpDisponibilidadRepository() }),
  postulaciones: createPostulacionesUseCases({ postulaciones, usuarios }),
  perfil: createPerfilUseCases({ perfil }),
};

// --- Estado global (presentación) ---
export const authStore = createAuthStore(authService);
export const preferencesStore = createPreferencesStore(storage);

// Un 401 en cualquier microservicio significa que el token venció o fue revocado: se vuelve al login.
setUnauthorizedHandler(() => {
  void authStore.getState().expire('Tu sesión expiró o fue cerrada. Inicia sesión nuevamente.');
  preferencesStore.getState().setTutorMode(false);
});
