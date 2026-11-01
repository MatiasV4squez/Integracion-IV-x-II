import type { PostulacionesRepository } from './puertos/postulaciones.repository.js';

export class ListarPostulacionesPendientesUseCase {
  constructor(private readonly postulaciones: PostulacionesRepository) {}
  ejecutar() { return this.postulaciones.listarPendientes(); }
}
