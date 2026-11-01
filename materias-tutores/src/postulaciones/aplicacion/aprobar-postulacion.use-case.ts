import { PostulacionesError, validarNotaAcreditada } from '../dominio/postulacion.js';
import type { AsignarRolTutorPort } from './puertos/asignar-rol-tutor.port.js';
import type { PostulacionesRepository } from './puertos/postulaciones.repository.js';

export class AprobarPostulacionUseCase {
  constructor(private readonly postulaciones: PostulacionesRepository, private readonly roles: AsignarRolTutorPort) {}

  async ejecutar(idPostulacion: bigint, idAdministrador: bigint, nota: number) {
    validarNotaAcreditada(nota);
    const postulacion = await this.postulaciones.prepararAprobacion(idPostulacion, idAdministrador, nota, new Date());
    if (!postulacion) throw new PostulacionesError('CONFLICTO', 'La postulación no está pendiente');
    await this.roles.asignar(postulacion.idUsuario);
    return this.postulaciones.habilitar(postulacion);
  }
}
