import type { RegisterInput, ServiceResult, User } from '@/domain/auth/auth';

/**
 * Puerto de autenticación. Adaptadores: `infrastructure/http/http-auth-gateway` (usuarios-auth vía
 * API Gateway) e `infrastructure/demo/mock-auth-gateway` (cuentas de ejemplo).
 */
export interface AuthGateway {
  login(email: string, password: string): Promise<ServiceResult<{ user: User; token: string }>>;
  register(input: RegisterInput): Promise<ServiceResult<User>>;
  /** Simula el clic en el enlace de verificación que llega por correo (RF01, BR11). */
  verifyEmail(email: string): Promise<ServiceResult<User>>;
  /** Envía (otra vez) el enlace de verificación al correo. Solo existe con backend. */
  resendVerification?(email: string): Promise<ServiceResult<null>>;
  /** Revoca el token en el servidor al cerrar sesión. Solo existe con backend. */
  logout?(token: string): Promise<void>;
  /**
   * Confirma con el servidor que el token guardado sigue vigente (no revocado ni vencido por inactividad).
   * `unknown` = no se pudo consultar (sin conexión): se conserva la sesión local.
   */
  validateSession?(token: string): Promise<'valid' | 'invalid' | 'unknown'>;
  /** Confirma el correo con el token del enlace de verificación. Solo existe con backend. */
  confirmEmail?(token: string): Promise<ServiceResult<null>>;
}
