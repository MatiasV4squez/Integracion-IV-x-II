import type { AuthGateway } from '@/application/ports/auth-gateway';
import type { AuthErrorCode } from '@/domain/auth/auth';
import { AppError } from '@/shared/errors';

import * as authApi from './usuarios-auth-api';

const fail = (error: AuthErrorCode, message: string) => ({ ok: false as const, error, message });

/** Traduce un error del API Gateway / usuarios-auth a un resultado con mensaje para la pantalla. */
function toFailure(error: unknown, byStatus: Partial<Record<number, AuthErrorCode>> = {}) {
  if (!(error instanceof AppError)) return fail('SERVER_ERROR', 'Ocurrió un error inesperado. Intenta de nuevo.');
  if (error.status === 0) return fail('NETWORK_ERROR', error.message);
  const code: AuthErrorCode | undefined =
    {
      AUTH_INVALID_CREDENTIALS: 'INVALID_CREDENTIALS' as const,
      AUTH_ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED' as const,
      AUTH_ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE' as const,
    }[error.code ?? ''] ?? byStatus[error.status];
  if (code) return fail(code, error.message);
  if (error.status >= 500) return fail('SERVER_ERROR', 'El servidor no está disponible en este momento. Intenta más tarde.');
  return fail('INVALID_DATA', error.message);
}

/**
 * Autenticación real contra usuarios-auth a través del API Gateway (NFR25). Implementa la misma
 * interfaz que `createMockAuthGateway`, así el servicio, el estado y las pantallas no cambian.
 */
export function createHttpAuthGateway(): AuthGateway {
  return {
    async login(email, password) {
      try {
        const res = await authApi.login(email, password);
        return { ok: true, data: { user: authApi.aUser(res.usuario), token: res.access_token } };
      } catch (error) {
        return toFailure(error, { 401: 'INVALID_CREDENTIALS' });
      }
    },

    async register(input) {
      try {
        const res = await authApi.registrar(input.name.trim(), input.email, input.password);
        const user = authApi.aUser({ id_usuario: res.id, nombre: res.nombre, correo_institucional: res.correo, estado_cuenta: res.estado, roles: ['ESTUDIANTE'] });
        return { ok: true, data: user };
      } catch (error) {
        return toFailure(error, { 409: 'EMAIL_TAKEN' });
      }
    },

    /**
     * usuarios-auth verifica el correo con el token que llega en el enlace (no desde la app), así que
     * aquí solo se reenvía ese enlace.
     */
    async verifyEmail() {
      return fail('NOT_FOUND', 'Abre el enlace que te enviamos al correo para verificar tu cuenta.');
    },

    async resendVerification(email) {
      try {
        await authApi.reenviarVerificacion(email);
        return { ok: true, data: null };
      } catch (error) {
        return toFailure(error);
      }
    },

    /** POST /auth/verificar-correo: 400 token inválido, 409 ya usado o correo ya verificado, 410 vencido. */
    async confirmEmail(token) {
      try {
        await authApi.verificarCorreo(token);
        return { ok: true, data: null };
      } catch (error) {
        return toFailure(error, { 400: 'TOKEN_INVALID', 409: 'TOKEN_USED', 410: 'TOKEN_EXPIRED' });
      }
    },

    async logout() {
      // El token ya está en el cliente HTTP; si falla, igual expira por inactividad en el servidor.
      await authApi.logout().catch(() => undefined);
    },

    async validateSession() {
      try {
        await authApi.fetchSesionActual();
        return 'valid';
      } catch (error) {
        return error instanceof AppError && (error.status === 401 || error.status === 403) ? 'invalid' : 'unknown';
      }
    },
  };
}
