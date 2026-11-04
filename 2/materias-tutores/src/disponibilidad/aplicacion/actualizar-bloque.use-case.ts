import { exigirBloqueDisponible, validarHorario, type BloqueHorario, type HorarioBloque } from '../dominio/bloque-horario.js';
import type { DisponibilidadRepository } from './puertos/disponibilidad.repository.js';

export class ActualizarBloqueUseCase {
  constructor(private readonly repositorio: DisponibilidadRepository) {}

  async ejecutar(idTutor: bigint, idBloque: bigint, cambios: Partial<HorarioBloque>): Promise<BloqueHorario> {
    const bloque = exigirBloqueDisponible(await this.repositorio.buscarPropio(idTutor, idBloque));
    const horario = { dia: cambios.dia ?? bloque.dia, horaInicio: cambios.horaInicio ?? bloque.horaInicio, horaFin: cambios.horaFin ?? bloque.horaFin };
    validarHorario(horario);
    return this.repositorio.actualizarDisponible(idTutor, idBloque, horario);
  }
}
