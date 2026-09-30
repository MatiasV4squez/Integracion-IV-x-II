import type { SubjectDetail } from '@/types/session';

export const SUBJECTS: SubjectDetail[] = [
  { code: 'MAT1010', name: 'Cálculo I', area: 'Matemáticas', units: ['Límites y continuidad', 'Derivadas', 'Aplicaciones de la derivada', 'Integrales'] },
  { code: 'MAT1020', name: 'Álgebra Lineal', area: 'Matemáticas', units: ['Matrices y sistemas', 'Espacios vectoriales', 'Transformaciones lineales', 'Valores propios'] },
  { code: 'FIS1002', name: 'Física General', area: 'Ciencias', units: ['Cinemática', 'Dinámica', 'Trabajo y energía', 'Ondas'] },
  { code: 'QUI1001', name: 'Química General', area: 'Ciencias', units: ['Estequiometría', 'Enlace químico', 'Soluciones', 'Equilibrio químico'] },
  { code: 'INFO1120', name: 'Programación', area: 'Informática', units: ['Variables y control de flujo', 'Funciones', 'Estructuras de datos', 'Recursión'] },
  { code: 'INFO1140', name: 'Bases de Datos', area: 'Informática', units: ['Modelo relacional', 'SQL básico', 'Normalización', 'Transacciones'] },
  { code: 'EST1010', name: 'Estadística', area: 'Matemáticas', units: ['Estadística descriptiva', 'Probabilidades', 'Distribuciones', 'Inferencia'] },
];

export function getSubject(code: string): SubjectDetail | undefined {
  return SUBJECTS.find((s) => s.code === code);
}
