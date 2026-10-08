import type { EstadoReputacion, PerfilReputacion } from '../../domain/reputacion.js';

export type EventoCalificacion = {
  idTutor: bigint;
  idCalificacion: bigint;
  puntuacion: number;
};

export interface ReputacionTransaccion {
  buscarEvento(idCalificacion: bigint): Promise<EventoCalificacion | null>;
  buscarPerfil(idTutor: bigint): Promise<PerfilReputacion | null>;
  tutorHabilitado(idTutor: bigint): Promise<boolean>;
  registrarEvento(evento: EventoCalificacion): Promise<void>;
  acumularCalificacion(idTutor: bigint, puntuacion: number): Promise<PerfilReputacion>;
  guardarEstado(idTutor: bigint, estado: EstadoReputacion): Promise<void>;
}

export interface ReputacionRepository {
  consultarPerfil(idTutor: bigint): Promise<PerfilReputacion | null>;
  tutorHabilitado(idTutor: bigint): Promise<boolean>;
  ejecutarTransaccion<T>(operacion: (tx: ReputacionTransaccion) => Promise<T>): Promise<T>;
}

export const REPUTACION_REPOSITORY = Symbol('REPUTACION_REPOSITORY');
