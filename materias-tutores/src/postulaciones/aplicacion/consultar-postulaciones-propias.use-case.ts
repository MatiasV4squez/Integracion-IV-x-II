import type { PostulacionesRepository } from './puertos/postulaciones.repository.js';

export class ConsultarPostulacionesPropiasUseCase {
  constructor(private readonly postulaciones: PostulacionesRepository) {}
  ejecutar(idUsuario: bigint) { return this.postulaciones.consultarPropias(idUsuario); }
}
