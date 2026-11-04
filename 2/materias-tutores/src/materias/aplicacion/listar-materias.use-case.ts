import type { Materia } from '../dominio/materia.js';
import type { MateriasRepository } from './puertos/materias.repository.js';

export class ListarMateriasUseCase {
  constructor(private readonly repositorio: MateriasRepository) {}

  ejecutar(): Promise<Materia[]> {
    return this.repositorio.listarCatalogo();
  }
}
