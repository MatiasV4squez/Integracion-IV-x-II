import type { Calificacion } from '../../dominio/entidades/calificacion';

export interface RepositorioEntregas {
  registrarPendiente(idCalificacion: bigint): Promise<void>;
  buscar(
    idCalificacion: bigint,
  ): Promise<{ fecha_entrega: Date | null; calificacion: Calificacion } | null>;
  consultarPendientes(
    limite: number,
  ): Promise<Array<{ id_calificacion: bigint }>>;
  registrarIntento(idCalificacion: bigint, fechaEntrega?: Date): Promise<void>;
}
