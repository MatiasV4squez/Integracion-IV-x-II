import type { TutorBusqueda } from './models/tutor.busqueda.js';
import type { TutoresRepository } from './ports/tutores.repository.js';
import type { DisponibilidadTutoresPort } from './ports/disponibilidad-tutores.port.js';

export class BuscarTutoresPorMateriaUseCase {
  constructor(
    private readonly repositorio: TutoresRepository,
    private readonly disponibilidad: DisponibilidadTutoresPort,
  ) {}

  async ejecutar(idMateria: bigint): Promise<TutorBusqueda[]> {
    const tutores = await this.repositorio.buscarHabilitadosPorMateria(idMateria);
    if (tutores.length === 0) return [];

    const horarios = await this.disponibilidad.consultarPorTutores(tutores.map((tutor) => tutor.idTutor));
    return tutores.map((tutor) => ({
      ...tutor,
      horariosDisponibles: horarios.get(tutor.idTutor) ?? [],
    }));
  }
}
