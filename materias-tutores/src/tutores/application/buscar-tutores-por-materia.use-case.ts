import type { TutoresRepository } from './ports/tutores.repository.js';
import type { DisponibilidadTutoresPort } from './ports/disponibilidad-tutores.port.js';
import type { Paginacion } from './models/paginacion.js';
import type { ResultadoBusquedaTutores } from './models/resultado-busqueda-tutores.js';

export class BuscarTutoresPorMateriaUseCase {
  constructor(
    private readonly repositorio: TutoresRepository,
    private readonly disponibilidad: DisponibilidadTutoresPort,
  ) {}

  async ejecutar(idMateria: bigint, paginacion: Paginacion): Promise<ResultadoBusquedaTutores> {
    const { items: tutores, total } = await this.repositorio.buscarHabilitadosPorMateria(idMateria, paginacion);
    if (tutores.length === 0) {
      return {
        items: [],
        total,
        page: paginacion.page,
        limit: paginacion.limit,
        totalPages: Math.ceil(total / paginacion.limit),
      };
    }

    const horarios = await this.disponibilidad.consultarPorTutores(tutores.map((tutor) => tutor.idTutor));
    const tutoresConHorarios = tutores.map((tutor) => ({
      ...tutor,
      horariosDisponibles: horarios.get(tutor.idTutor) ?? [],
    }));

    return {
      items: tutoresConHorarios,
      total,
      page: paginacion.page,
      limit: paginacion.limit,
      totalPages: Math.ceil(total / paginacion.limit),
    };
  }
}
