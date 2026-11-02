import type { DatosPublicos, UsuariosRepository } from '@/application/ports/repositories';
import type { User } from '@/domain/auth/auth';

import { api, SERVICIOS } from './http-client';

/** Usuario según usuarios-auth (los IDs BIGINT viajan como texto, roles y estado en mayúsculas). */
export type UsuarioApi = {
  id_usuario: string;
  nombre: string;
  correo_institucional: string;
  estado_cuenta: string;
  correo_verificado: boolean;
  roles: string[];
};

export type LoginResponse = { usuario: UsuarioApi; access_token: string; token_type: 'Bearer'; expires_in: number };


const ROLES: Record<string, User['roles'][number]> = { ESTUDIANTE: 'tutee', TUTOR: 'tutor', ADMINISTRADOR: 'admin', ADMIN: 'admin' };
const ESTADOS: Record<string, User['status']> = { ACTIVO: 'activa', SUSPENDIDO: 'suspendida' };

/** Convierte el usuario del micro al modelo de la app. */
export function aUser(u: Pick<UsuarioApi, 'id_usuario' | 'nombre' | 'correo_institucional' | 'estado_cuenta' | 'roles'>): User {
  const roles = [...new Set(u.roles.map((r) => ROLES[r.trim().toUpperCase()]).filter((r) => r !== undefined))];
  return {
    id: u.id_usuario,
    name: u.nombre,
    email: u.correo_institucional,
    // Todo usuario registrado es estudiante (tutee), aunque el token no lo diga explícitamente.
    roles: roles.includes('tutee') ? roles : ['tutee', ...roles],
    status: ESTADOS[u.estado_cuenta.trim().toUpperCase()] ?? 'inactiva',
  };
}

/** POST /usuarios-auth/auth/login — devuelve el JWT que aceptan todos los micros. */
export const login = (correo: string, password: string) =>
  api.post<LoginResponse>(`${SERVICIOS.usuarios}/auth/login`, { correo_institucional: correo, password });

/** POST /usuarios-auth/auth/logout — revoca la sesión del token actual. */
export const logout = () => api.post<void>(`${SERVICIOS.usuarios}/auth/logout`, undefined);

/** GET /usuarios-auth/auth/sesion — valida que el token siga vigente (no revocado ni inactivo). */
export const fetchSesionActual = (signal?: AbortSignal) =>
  api.get<{ sub: string; roles: string[] }>(`${SERVICIOS.usuarios}/auth/sesion`, undefined, signal);

/** POST /usuarios-auth/usuarios/registro — la contraseña viaja en `password_hash` (así la nombra el micro). */
export const registrar = (nombre: string, correo: string, password: string) =>
  api.post<{ id: string; nombre: string; correo: string; estado: string }>(`${SERVICIOS.usuarios}/usuarios/registro`, {
    nombre,
    correo_institucional: correo,
    password_hash: password,
  });

/** POST /usuarios-auth/auth/reenviar-verificacion — envía el enlace de verificación al correo. */
export const reenviarVerificacion = (correo: string) =>
  api.post<{ mensaje: string }>(`${SERVICIOS.usuarios}/auth/reenviar-verificacion`, { correo_institucional: correo });

/** POST /usuarios-auth/auth/verificar-correo — confirma el correo con el token del enlace (64 caracteres). */
export const verificarCorreo = (token: string) =>
  api.post<unknown>(`${SERVICIOS.usuarios}/auth/verificar-correo`, { token: token.trim() });

/**
 * GET /usuarios-auth/usuarios?ids= — nombre, carrera, semestre y biografía de otros usuarios.
 * El micro acepta hasta 100 IDs por consulta.
 */
export async function fetchDatosPublicos(ids: string[], signal?: AbortSignal): Promise<Map<string, DatosPublicos>> {
  const unicos = [...new Set(ids)].filter(Boolean);
  const porId = new Map<string, DatosPublicos>();
  for (let i = 0; i < unicos.length; i += 100) {
    const lote = await api.get<DatosPublicos[]>(`${SERVICIOS.usuarios}/usuarios`, { ids: unicos.slice(i, i + 100).join(',') }, signal);
    for (const u of lote) porId.set(u.id, u);
  }
  return porId;
}

/** Adaptador del puerto UsuariosRepository: si usuarios-auth falla, devuelve un mapa vacío (se muestran IDs). */
export function createHttpUsuariosRepository(): UsuariosRepository {
  return {
    datosPublicos: (ids, signal) =>
      fetchDatosPublicos(ids, signal).catch((error: unknown) => {
        if (signal?.aborted) throw error;
        return new Map<string, DatosPublicos>();
      }),
  };
}
