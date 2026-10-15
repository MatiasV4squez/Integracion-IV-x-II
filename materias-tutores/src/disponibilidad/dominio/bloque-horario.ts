export interface HorarioBloque {
  dia: string;
  horaInicio: string;
  horaFin: string;
}

export interface BloqueHorario extends HorarioBloque {
  idBloque: bigint;
  idTutor: bigint;
  estadoBloque: string;
}

export class DisponibilidadError extends Error {
  constructor(
    public readonly codigo: 'ENTRADA_INVALIDA' | 'NO_ENCONTRADO' | 'CONFLICTO',
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'DisponibilidadError';
  }
}

export function validarHorario(horario: HorarioBloque): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(horario.dia)) throw new DisponibilidadError('ENTRADA_INVALIDA', 'La fecha debe usar el formato YYYY-MM-DD');
  const fecha = new Date(`${horario.dia}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== horario.dia) throw new DisponibilidadError('ENTRADA_INVALIDA', 'La fecha no es valida');
  for (const campo of ['horaInicio', 'horaFin'] as const) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario[campo])) throw new DisponibilidadError('ENTRADA_INVALIDA', `${campo} debe usar el formato HH:mm`);
  }
  if (horario.horaInicio >= horario.horaFin) throw new DisponibilidadError('ENTRADA_INVALIDA', 'La hora de inicio debe ser menor que la hora de fin');
}

export function seSolapan(primero: HorarioBloque, segundo: HorarioBloque): boolean {
  return primero.dia === segundo.dia && primero.horaInicio < segundo.horaFin && primero.horaFin > segundo.horaInicio;
}

export function exigirBloqueDisponible(bloque: BloqueHorario | null): BloqueHorario {
  if (!bloque) throw new DisponibilidadError('NO_ENCONTRADO', 'Bloque de disponibilidad no encontrado');
  if (bloque.estadoBloque !== 'DISPONIBLE') throw new DisponibilidadError('CONFLICTO', 'El bloque no está disponible');
  return bloque;
}
