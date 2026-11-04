import type { BloqueHorario } from '../dominio/bloque-horario.js';
import { horarioEnSantiago } from '../dominio/horario-santiago.js';
import type { DisponibilidadRepository } from './puertos/disponibilidad.repository.js';
import type { Reloj } from './puertos/reloj.port.js';

export class ConsultarDisponibilidadTutorUseCase {
  constructor(
    private readonly repositorio: DisponibilidadRepository,
    private readonly reloj: Reloj,
  ) {}

  ejecutar(idTutor: bigint): Promise<BloqueHorario[]> {
    return this.repositorio.consultarDisponibles(idTutor, horarioEnSantiago(this.reloj.ahora()));
  }
}
