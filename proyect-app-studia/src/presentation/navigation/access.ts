import type { AccountRole } from '@/domain/auth/auth';

/** Modo con el que se usa la app. Un usuario con rol Tutor puede alternar entre ambos (RF03). */
export type ActiveRole = 'tutee' | 'tutor';
export type TabName = 'index' | 'buscar' | 'historial' | 'perfil';
export type RouteGroup = 'public' | 'authenticated' | 'tutor' | 'admin';

export const ROUTES = {
  login: '/login',
  registro: '/registro',
  home: '/',
  historial: '/historial',
  publicarDisponibilidad: '/publicar-disponibilidad',
  postulacionTutor: '/postulacion-tutor',
  adminPostulaciones: '/admin/postulaciones',
  verificarCuenta: '/verificar-cuenta',
} as const;

export function hasRole(roles: readonly AccountRole[], role: AccountRole): boolean {
  return roles.includes(role);
}

export function canBeTutor(roles: readonly AccountRole[]): boolean {
  return hasRole(roles, 'tutor');
}

export function isAdmin(roles: readonly AccountRole[]): boolean {
  return hasRole(roles, 'admin');
}

/** Modo activo: solo es Tutor si lo pidió Y tiene ese rol. */
export function getActiveRole(roles: readonly AccountRole[], tutorMode: boolean): ActiveRole {
  return tutorMode && canBeTutor(roles) ? 'tutor' : 'tutee';
}

/** Pestañas visibles: el Tutor no busca tutores, los publica. */
export function getVisibleTabs(role: ActiveRole): TabName[] {
  return role === 'tutor' ? ['index', 'historial', 'perfil'] : ['index', 'buscar', 'historial', 'perfil'];
}

/** ¿Puede entrar al grupo de rutas? Sirve para los `Stack.Protected` del layout raíz. */
export function canAccess(group: RouteGroup, session: { isAuthenticated: boolean; roles: readonly AccountRole[] }): boolean {
  if (group === 'public') return !session.isAuthenticated;
  if (group === 'authenticated') return session.isAuthenticated;
  if (group === 'admin') return session.isAuthenticated && isAdmin(session.roles);
  return session.isAuthenticated && canBeTutor(session.roles);
}
