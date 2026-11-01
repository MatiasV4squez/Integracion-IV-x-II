import { PostulacionesError } from '../dominio/postulacion.js';
import type { AsignarRolTutorPort } from './puertos/asignar-rol-tutor.port.js';
import type { PostulacionesRepository } from './puertos/postulaciones.repository.js';

export class ReintentarAsignacionRolUseCase {
  constructor(private readonly postulaciones: PostulacionesRepository, private readonly roles: AsignarRolTutorPort) {}

  async ejecutar(idPostulacion: bigint) {
    const postulacion = await this.postulaciones.obtener(idPostulacion);
    if (!postulacion || postulacion.estado !== 'PENDIENTE_ROL') {
      throw new PostulacionesError('CONFLICTO', 'La postulación no espera asignación de rol');
    }
    await this.roles.asignar(postulacion.idUsuario);
    return this.postulaciones.habilitar(postulacion);
  }
}
