import { calcularReputacion, ReputacionError, validarCalificacion, validarIdentificador, type Reputacion } from '../domain/reputacion.js';
import type { EventoCalificacion, ReputacionRepository } from './ports/reputacion.repository.js';

export class RegistrarCalificacionUseCase {
  constructor(private readonly repositorio: ReputacionRepository) {}

  async ejecutar(evento: EventoCalificacion): Promise<Reputacion> {
    validarIdentificador(evento.idTutor);
    validarIdentificador(evento.idCalificacion);
    validarCalificacion(evento.puntuacion);
    return this.repositorio.ejecutarTransaccion(async (tx) => {
      const anterior = await tx.buscarEvento(evento.idCalificacion);
      if (anterior) {
        if (anterior.idTutor !== evento.idTutor || anterior.puntuacion !== evento.puntuacion) {
          throw new ReputacionError('CONFLICTO', 'La calificación ya pertenece a otro evento.');
        }
        const perfil = await tx.buscarPerfil(evento.idTutor);
        if (!perfil) throw new ReputacionError('CONFLICTO', 'El evento registrado no tiene un perfil asociado.');
        return calcularReputacion(perfil);
      }
      if (!(await tx.tutorHabilitado(evento.idTutor))) {
        throw new ReputacionError('CONFLICTO', 'El usuario no está habilitado como tutor.');
      }
      await tx.registrarEvento(evento);
      const perfil = await tx.acumularCalificacion(evento.idTutor, evento.puntuacion);
      const reputacion = calcularReputacion(perfil);
      await tx.guardarEstado(evento.idTutor, reputacion.estado);
      return reputacion;
    });
  }
}
