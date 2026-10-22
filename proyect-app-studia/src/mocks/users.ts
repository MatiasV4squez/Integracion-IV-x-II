import type { User } from '@/types/auth';

export type MockUserRecord = { user: User; password: string };

/**
 * Cuentas de demostración (sin backend). Las contraseñas están en texto plano SOLO porque esto es un
 * mock: el backend real las guarda con bcrypt/Argon2 (NFR02, CA12).
 */
export const MOCK_USERS: MockUserRecord[] = [
  {
    // Mismo usuario que @/mocks/sessions ME: es Tutee y también Tutor (RF03).
    user: { id: 'u-me', name: 'Alumno Demo', email: 'alumno.demo@uct.cl', roles: ['tutee', 'tutor'], status: 'activa', career: 'Ingeniería Civil Informática' },
    password: 'demo1234',
  },
  {
    user: { id: 'u-nuevo', name: 'Nuevo Alumno', email: 'nuevo.alumno@alu.uct.cl', roles: ['tutee'], status: 'activa', career: 'Pedagogía en Matemática' },
    password: 'nuevo1234',
  },
  {
    user: { id: 'u-suspendido', name: 'Cuenta Suspendida', email: 'suspendida@alu.uct.cl', roles: ['tutee'], status: 'suspendida' },
    password: 'susp1234',
  },
  {
    user: { id: 'u-inactivo', name: 'Sin Verificar', email: 'sin.verificar@alu.uct.cl', roles: ['tutee'], status: 'inactiva' },
    password: 'inac1234',
  },
];
