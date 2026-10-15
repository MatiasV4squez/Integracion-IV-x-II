export interface Reloj {
  ahora(): Date;
}

export const RELOJ_DISPONIBILIDAD = Symbol('RELOJ_DISPONIBILIDAD');
