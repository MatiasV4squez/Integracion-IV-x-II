import type { SubjectDetail } from '@/domain/sesiones/session';

/** Materia del catálogo; `id` es el identificador que usan los microservicios (con backend, el BIGINT). */
export type Materia = SubjectDetail & { id: string };
