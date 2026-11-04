export type EstadoReputacion = 'ACTIVO' | 'EN_REVISION';

export type PerfilReputacion = {
  idTutor: bigint;
  sumaCalificaciones: number;
  cantidadCalificaciones: number;
  estado: EstadoReputacion;
};

export type Reputacion = {
  idTutor: string;
  cantidadCalificaciones: number;
  promedio: number | null;
  estado: EstadoReputacion;
};

export class ReputacionError extends Error {
  constructor(
    readonly codigo: 'ENTRADA_INVALIDA' | 'TUTOR_NO_ENCONTRADO' | 'CONFLICTO',
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ReputacionError';
  }
}

export function validarCalificacion(puntuacion: number): void {
  if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
    throw new ReputacionError('ENTRADA_INVALIDA', 'La puntuación debe ser un entero entre 1 y 5.');
  }
}

export function validarIdentificador(id: bigint): void {
  if (id < 1n || id > 9223372036854775807n) {
    throw new ReputacionError('ENTRADA_INVALIDA', 'El identificador debe ser un entero positivo BIGINT.');
  }
}

export function calcularReputacion(perfil: PerfilReputacion): Reputacion {
  const promedio = perfil.cantidadCalificaciones === 0 ? null : perfil.sumaCalificaciones / perfil.cantidadCalificaciones;
  const estado = perfil.estado === 'EN_REVISION' || (perfil.cantidadCalificaciones >= 3 && promedio !== null && promedio < 2.5) ? 'EN_REVISION' : 'ACTIVO';
  return { idTutor: perfil.idTutor.toString(), cantidadCalificaciones: perfil.cantidadCalificaciones, promedio, estado };
}
