import { exigirBloqueDisponible, type BloqueHorario } from '../dominio/bloque-horario.js';
import type { DisponibilidadRepository } from './puertos/disponibilidad.repository.js';

export class DesactivarBloqueUseCase {
  constructor(private readonly repositorio: DisponibilidadRepository) {}

  async ejecutar(idTutor: bigint, idBloque: bigint): Promise<BloqueHorario> {
    exigirBloqueDisponible(await this.repositorio.buscarPropio(idTutor, idBloque));
    return this.repositorio.desactivarDisponible(idTutor, idBloque);
  }
}
