import type { TutorResumen } from './tutor-resumen.js';
import type { HorarioDisponible } from './horario-disponible.js';

export type TutorBusqueda = TutorResumen & {
  horariosDisponibles: HorarioDisponible[];
};
