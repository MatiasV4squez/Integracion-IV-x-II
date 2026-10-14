export const PASSWORD_VERIFIER = Symbol('PASSWORD_VERIFIER');
export const TOKEN_PROVIDER = Symbol('TOKEN_PROVIDER');
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
export const MODERACION_CUENTAS_REPOSITORY = Symbol(
  'MODERACION_CUENTAS_REPOSITORY',
);
export const SESSION_IDLE_TIMEOUT_SECONDS = Symbol(
  'SESSION_IDLE_TIMEOUT_SECONDS',
);

export const ESTADOS_CUENTA_MODERABLES = ['SUSPENDIDO', 'ACTIVO'] as const;
export type EstadoCuentaModerable = (typeof ESTADOS_CUENTA_MODERABLES)[number];

export interface PasswordVerifier {
  verificar(passwordHash: string, password: string): Promise<boolean>;
}

export interface IdentidadAutenticada {
  id_usuario: string;
  correo_institucional: string;
  roles: string[];
}

export interface AuthenticatedUser {
  sub: string;
  jti: string;
  correo_institucional: string;
  roles: string[];
}

export interface TokenEmitido {
  valor: string;
  jti: string;
  fechaExpiracion: Date;
  expiraEnSegundos: number;
}

export interface TokenProvider {
  emitir(usuario: IdentidadAutenticada): Promise<TokenEmitido>;
  verificar(token: string): Promise<AuthenticatedUser | null>;
}

export interface NuevaSesion {
  idUsuario: bigint;
  jti: string;
  fechaExpiracion: Date;
}

export interface ActividadSesion {
  idUsuario: bigint;
  jti: string;
  ahora: Date;
  limiteInactividad: Date;
}

export interface SessionRepository {
  crearSiCuentaActiva(sesion: NuevaSesion): Promise<boolean>;
  registrarActividad(actividad: ActividadSesion): Promise<boolean>;
  revocar(idUsuario: bigint, jti: string): Promise<void>;
}

export interface ResultadoModeracion {
  id_usuario: string;
  estado_cuenta: EstadoCuentaModerable;
  sesiones_revocadas: number;
}

export interface ModeracionCuentasRepository {
  cambiarEstado(
    idUsuario: bigint,
    estado: EstadoCuentaModerable,
  ): Promise<ResultadoModeracion | null>;
}
