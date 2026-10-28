import { AUTH } from '@/constants/app-config';
import type { MockUserRecord } from '@/mocks/users';
import { MOCK_USERS } from '@/mocks/users';
import type { RegisterInput, ServiceResult, User } from '@/types/auth';
import { normalizeEmail } from '@/utils/email';
import { createMockToken } from '@/utils/token';

/**
 * Puerta de entrada al backend de autenticación. Hoy hay una versión simulada (`createMockAuthGateway`);
 * cuando exista el API Gateway se escribe otra con la misma interfaz y el resto de la app no cambia.
 */
export interface AuthGateway {
  login(email: string, password: string): Promise<ServiceResult<{ user: User; token: string }>>;
  register(input: RegisterInput): Promise<ServiceResult<User>>;
  /** Simula el clic en el enlace de verificación que llega por correo (RF01, BR11). */
  verifyEmail(email: string): Promise<ServiceResult<User>>;
}

export type MockAuthGatewayOptions = {
  users?: MockUserRecord[];
  now?: () => number;
  /** Retraso artificial para ver los estados de carga en la interfaz. */
  latencyMs?: number;
};

const fail = (error: Extract<ServiceResult<never>, { ok: false }>['error'], message: string) => ({ ok: false as const, error, message });

export function createMockAuthGateway(options: MockAuthGatewayOptions = {}): AuthGateway {
  // Copia para no modificar los datos de ejemplo originales.
  const users: MockUserRecord[] = (options.users ?? MOCK_USERS).map((record) => ({ ...record, user: { ...record.user } }));
  const now = options.now ?? Date.now;
  const wait = () => (options.latencyMs ? new Promise<void>((resolve) => setTimeout(resolve, options.latencyMs)) : Promise.resolve());
  const find = (email: string) => users.find((record) => record.user.email === normalizeEmail(email));

  return {
    async login(email, password) {
      await wait();
      const record = find(email);
      // El mismo mensaje para "no existe" y "contraseña incorrecta": no revela qué correos están registrados.
      if (!record || record.password !== password) return fail('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
      if (record.user.status === 'suspendida') return fail('ACCOUNT_SUSPENDED', 'Tu cuenta está suspendida. Contacta a un administrador.');
      if (record.user.status === 'inactiva') return fail('ACCOUNT_INACTIVE', 'Aún no verificas tu correo. Revisa el enlace que te enviamos.');
      return { ok: true, data: { user: { ...record.user }, token: createMockToken(record.user.id, now(), AUTH.TOKEN_TTL_MS) } };
    },

    async register(input) {
      await wait();
      if (find(input.email)) return fail('EMAIL_TAKEN', 'Ya existe una cuenta con ese correo.');
      const user: User = {
        id: `u-${users.length + 1}-${now()}`,
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        roles: ['tutee'],
        // RF01: la cuenta nace inactiva hasta que el usuario abre el enlace de verificación.
        status: 'inactiva',
      };
      users.push({ user, password: input.password });
      return { ok: true, data: { ...user } };
    },

    async verifyEmail(email) {
      await wait();
      const record = find(email);
      if (!record) return fail('NOT_FOUND', 'No encontramos esa cuenta.');
      if (record.user.status === 'inactiva') record.user.status = 'activa';
      return { ok: true, data: { ...record.user } };
    },
  };
}
