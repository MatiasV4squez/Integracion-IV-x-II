import { calcularReputacion, ReputacionError, validarIdentificador, type Reputacion } from '../domain/reputacion.js';
import type { ReputacionRepository } from './ports/reputacion.repository.js';

export class ConsultarReputacionUseCase {
  constructor(private readonly repositorio: ReputacionRepository) {}

  async ejecutar(idTutor: bigint): Promise<Reputacion> {
    validarIdentificador(idTutor);
    const perfil = await this.repositorio.consultarPerfil(idTutor);
    if (perfil) return calcularReputacion(perfil);
    if (!(await this.repositorio.tutorHabilitado(idTutor))) {
      throw new ReputacionError('TUTOR_NO_ENCONTRADO', 'Tutor no encontrado.');
    }
    return calcularReputacion({ idTutor, sumaCalificaciones: 0, cantidadCalificaciones: 0, estado: 'ACTIVO' });
  }
}
