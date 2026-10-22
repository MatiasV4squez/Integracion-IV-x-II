import { AUTH, STORAGE } from '@/constants/app-config';
import type { AuthGateway } from '@/services/auth-gateway';
import type { StorageService } from '@/services/storage-service';
import type { TokenStorage } from '@/services/token-storage';
import type { AuthSession, LoginInput, RegisterInput, ServiceResult, User } from '@/types/auth';
import { isInstitutionalEmail, normalizeEmail } from '@/utils/email';
import { isTokenExpired } from '@/utils/token';

export type AuthServiceDeps = {
  gateway: AuthGateway;
  tokenStorage: TokenStorage;
  storage: StorageService;
  now?: () => number;
  inactivityMs?: number;
};

const DOMAIN_MESSAGE = 'Usa tu correo institucional (@alu.uct.cl o @uct.cl).';

/**
 * Servicio de sesión del usuario: iniciar sesión, cerrar sesión, recuperar la sesión guardada y
 * entregar los datos del usuario. Aplica las reglas de dominio y de inactividad del SRS; el backend
 * (o su simulación) solo valida credenciales.
 */
export function createAuthService(deps: AuthServiceDeps) {
  const { gateway, tokenStorage, storage } = deps;
  const now = deps.now ?? Date.now;
  const inactivityMs = deps.inactivityMs ?? AUTH.SESSION_INACTIVITY_MS;

  async function clearSession() {
    await tokenStorage.clear();
    await storage.remove(STORAGE.KEYS.AUTH_USER);
    await storage.remove(STORAGE.KEYS.AUTH_LAST_ACTIVITY);
  }

  async function login(input: LoginInput): Promise<ServiceResult<AuthSession>> {
    const email = normalizeEmail(input.email);
    if (!isInstitutionalEmail(email)) return { ok: false, error: 'INVALID_EMAIL_DOMAIN', message: DOMAIN_MESSAGE };

    const result = await gateway.login(email, input.password);
    if (!result.ok) return result;

    const lastActivityAt = now();
    await tokenStorage.set(result.data.token);
    await storage.setJSON(STORAGE.KEYS.AUTH_USER, result.data.user);
    await storage.setJSON(STORAGE.KEYS.AUTH_LAST_ACTIVITY, lastActivityAt);
    return { ok: true, data: { user: result.data.user, token: result.data.token, lastActivityAt } };
  }

  async function logout(): Promise<void> {
    await clearSession();
  }

  /** Recupera la sesión guardada al abrir la app. Si pasó más de 30 minutos sin actividad, la cierra (NFR04). */
  async function restoreSession(): Promise<ServiceResult<AuthSession>> {
    const token = await tokenStorage.get();
    const user = await storage.getJSON<User>(STORAGE.KEYS.AUTH_USER);
    if (!token || !user) return { ok: false, error: 'NO_SESSION', message: 'No hay una sesión guardada.' };

    const lastActivityAt = await storage.getJSON<number>(STORAGE.KEYS.AUTH_LAST_ACTIVITY);
    const expired = isTokenExpired(token, now()) || lastActivityAt === null || now() - lastActivityAt > inactivityMs;
    if (expired) {
      await clearSession();
      return { ok: false, error: 'SESSION_EXPIRED', message: 'Tu sesión expiró por inactividad. Inicia sesión nuevamente.' };
    }
    return { ok: true, data: { user, token, lastActivityAt } };
  }

  /** Registra actividad del usuario para reiniciar el contador de inactividad. */
  async function touch(): Promise<number> {
    const at = now();
    await storage.setJSON(STORAGE.KEYS.AUTH_LAST_ACTIVITY, at);
    return at;
  }

  async function getCurrentUser(): Promise<User | null> {
    return storage.getJSON<User>(STORAGE.KEYS.AUTH_USER);
  }

  async function register(input: RegisterInput): Promise<ServiceResult<User>> {
    if (!isInstitutionalEmail(input.email)) return { ok: false, error: 'INVALID_EMAIL_DOMAIN', message: DOMAIN_MESSAGE };
    return gateway.register({ ...input, email: normalizeEmail(input.email) });
  }

  async function verifyEmail(email: string): Promise<ServiceResult<User>> {
    return gateway.verifyEmail(normalizeEmail(email));
  }

  return { login, logout, restoreSession, touch, getCurrentUser, register, verifyEmail, inactivityMs };
}

export type AuthService = ReturnType<typeof createAuthService>;
