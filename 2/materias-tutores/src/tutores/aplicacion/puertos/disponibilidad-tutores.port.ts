import type { HorarioDisponible } from '../modelos/horario-disponible.js';

export interface DisponibilidadTutoresPort {
  consultarPorTutores(idsTutores: string[]): Promise<Map<string, HorarioDisponible[]>>;
}

export const DISPONIBILIDAD_TUTORES = Symbol('DISPONIBILIDAD_TUTORES');
