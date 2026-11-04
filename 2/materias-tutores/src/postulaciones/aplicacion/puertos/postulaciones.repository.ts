import type { Postulacion } from '../../dominio/postulacion.js';

export const POSTULACIONES_REPOSITORY = Symbol('POSTULACIONES_REPOSITORY');

export interface NuevaPostulacion {
  idUsuario: bigint;
  idMateria: bigint;
  certificadoRef: string;
  certificadoNombre: string;
  certificadoTipo: string;
}

export interface PostulacionesRepository {
  existeMateria(idMateria: bigint): Promise<boolean>;
  existeActiva(idUsuario: bigint, idMateria: bigint): Promise<boolean>;
  crear(datos: NuevaPostulacion): Promise<Postulacion>;
  listarPendientes(): Promise<Postulacion[]>;
  consultarPropias(idUsuario: bigint): Promise<Postulacion[]>;
  obtener(idPostulacion: bigint): Promise<Postulacion | null>;
  prepararAprobacion(idPostulacion: bigint, idAdministrador: bigint, nota: number, fecha: Date): Promise<Postulacion | null>;
  rechazarPendiente(idPostulacion: bigint, idAdministrador: bigint, motivo: string, fecha: Date): Promise<Postulacion | null>;
  habilitar(postulacion: Postulacion): Promise<Postulacion>;
}
