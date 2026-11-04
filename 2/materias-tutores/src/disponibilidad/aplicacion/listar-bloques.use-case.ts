import type { BloqueHorario } from '../dominio/bloque-horario.js';
import type { DisponibilidadRepository } from './puertos/disponibilidad.repository.js';

export class ListarBloquesUseCase {
  constructor(private readonly repositorio: DisponibilidadRepository) {}

  ejecutar(idTutor: bigint): Promise<BloqueHorario[]> {
    return this.repositorio.listarPropios(idTutor);
  }
}
