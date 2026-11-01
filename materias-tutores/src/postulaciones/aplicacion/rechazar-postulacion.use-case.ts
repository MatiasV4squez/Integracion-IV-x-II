import { PostulacionesError } from '../dominio/postulacion.js';
import type { PostulacionesRepository } from './puertos/postulaciones.repository.js';

export class RechazarPostulacionUseCase {
  constructor(private readonly postulaciones: PostulacionesRepository) {}

  async ejecutar(idPostulacion: bigint, idAdministrador: bigint, motivo: string) {
    const postulacion = await this.postulaciones.rechazarPendiente(idPostulacion, idAdministrador, motivo, new Date());
    if (!postulacion) throw new PostulacionesError('CONFLICTO', 'La postulación no está pendiente');
    return postulacion;
  }
}
