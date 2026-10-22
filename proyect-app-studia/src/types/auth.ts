import type { ACCOUNT_ROLES } from '@/constants/app-config';

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

/** activa: puede iniciar sesión. inactiva: aún no verifica su correo (RF01). suspendida: bloqueada por un Administrador (BR09). */
export type AccountStatus = 'activa' | 'inactiva' | 'suspendida';

export type User = {
  id: string;
  name: string;
  email: string;
  roles: AccountRole[];
  status: AccountStatus;
  career?: string;
};

export type AuthSession = {
  user: User;
  token: string;
  /** Marca de tiempo (ms) de la última actividad; sirve para cerrar la sesión por inactividad (NFR04). */
  lastActivityAt: number;
};

export type AuthErrorCode =
  | 'INVALID_EMAIL_DOMAIN'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_INACTIVE'
  | 'EMAIL_TAKEN'
  | 'NOT_FOUND'
  | 'NO_SESSION'
  | 'SESSION_EXPIRED';

/** Resultado de un servicio: nunca lanza por errores esperados, así la UI siempre puede mostrar un mensaje. */
export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: AuthErrorCode; message: string };

export type LoginInput = { email: string; password: string };
export type RegisterInput = { name: string; email: string; password: string };
