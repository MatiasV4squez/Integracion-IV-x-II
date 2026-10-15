import type { BloqueHorario, HorarioBloque } from '../../dominio/bloque-horario.js';
import type { ReferenciaHorario } from '../../dominio/horario-santiago.js';

export interface DisponibilidadRepository {
  listarActivosDelDia(idTutor: bigint, dia: string): Promise<BloqueHorario[]>;
  crear(idTutor: bigint, horario: HorarioBloque): Promise<BloqueHorario>;
  listarPropios(idTutor: bigint): Promise<BloqueHorario[]>;
  consultarDisponibles(idTutor: bigint, desde: ReferenciaHorario): Promise<BloqueHorario[]>;
  buscarPropio(idTutor: bigint, idBloque: bigint): Promise<BloqueHorario | null>;
  actualizarDisponible(idTutor: bigint, idBloque: bigint, horario: HorarioBloque): Promise<BloqueHorario>;
  desactivarDisponible(idTutor: bigint, idBloque: bigint): Promise<BloqueHorario>;
}

export const DISPONIBILIDAD_REPOSITORY = Symbol('DISPONIBILIDAD_REPOSITORY');
