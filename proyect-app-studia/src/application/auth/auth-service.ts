import { AUTH, STORAGE } from '@/shared/app-config';
import type { AuthGateway } from '@/application/ports/auth-gateway';
import type { StorageService, TokenStorage } from '@/application/ports/storage';
import type { AuthSession, LoginInput, RegisterInput, ServiceResult, User } from '@/domain/auth/auth';
import { isInstitutionalEmail, normalizeEmail } from '@/domain/auth/email';
import { isTokenExpired } from '@/domain/auth/token';

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
    const token = await tokenStorage.get();
    if (token) await gateway.logout?.(token);
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
    // Con backend, el servidor tiene la última palabra (el token pudo revocarse, p. ej. por una suspensión).
    if ((await gateway.validateSession?.(token)) === 'invalid') {
      await clearSession();
      return { ok: false, error: 'SESSION_EXPIRED', message: 'Tu sesión ya no es válida. Inicia sesión nuevamente.' };
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

  /** Reenvía el enlace de verificación (solo con backend: el mock verifica al instante con `verifyEmail`). */
  async function resendVerification(email: string): Promise<ServiceResult<null>> {
    if (!gateway.resendVerification) return { ok: true, data: null };
    return gateway.resendVerification(normalizeEmail(email));
  }

  /** Confirma el correo con el token del enlace (solo con backend). */
  async function confirmEmail(token: string): Promise<ServiceResult<null>> {
    if (!gateway.confirmEmail) return { ok: false, error: 'NOT_FOUND', message: 'La verificación por enlace solo existe con el backend conectado.' };
    return gateway.confirmEmail(token.trim());
  }

  /** true si el backend verifica el correo con un enlace real (y no con la simulación de la demo). */
  const verifiesByEmailLink = gateway.resendVerification !== undefined;

  return { login, logout, restoreSession, touch, getCurrentUser, register, verifyEmail, resendVerification, confirmEmail, verifiesByEmailLink, inactivityMs };
}

export type AuthService = ReturnType<typeof createAuthService>;
