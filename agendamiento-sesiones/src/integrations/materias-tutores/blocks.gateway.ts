// Contrato consumidor: materias-tutores es el propietario de los bloques.
export interface ReservationRequest {
  id: string;
  id_bloque: bigint;
  id_tutor: bigint;
  id_materia: bigint;
}

export interface ReservedSchedule {
  inicio: Date;
  fin: Date;
}

export abstract class BlocksGateway {
  abstract ensureConfigured(): void;
  abstract reserve(reservation: ReservationRequest): Promise<ReservedSchedule>;
  abstract release(reservation: ReservationRequest): Promise<void>;
}
