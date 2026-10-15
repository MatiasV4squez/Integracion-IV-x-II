import { DisponibilidadError, seSolapan, validarHorario, type BloqueHorario, type HorarioBloque } from '../dominio/bloque-horario.js';
import type { DisponibilidadRepository } from './puertos/disponibilidad.repository.js';

export class CrearBloqueUseCase {
  constructor(private readonly repositorio: DisponibilidadRepository) {}

  async ejecutar(idTutor: bigint, horario: HorarioBloque): Promise<BloqueHorario> {
    validarHorario(horario);
    const existentes = await this.repositorio.listarActivosDelDia(idTutor, horario.dia);
    if (existentes.some((bloque) => seSolapan(horario, bloque))) throw new DisponibilidadError('CONFLICTO', 'El horario choca con un bloque de disponibilidad ya existente');
    return this.repositorio.crear(idTutor, horario);
  }
}
