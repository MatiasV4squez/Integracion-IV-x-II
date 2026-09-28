/** Estados de una sesión según la máquina de estados definida en BR02 del SRS. */
export type SessionStatus =
  | 'pendiente'
  | 'confirmada'
  | 'rechazada'
  | 'expirada'
  | 'pendiente_cierre'
  | 'completada'
  | 'no_realizada'
  | 'inasistencia'
  | 'cancelada'
  | 'en_conflicto';

export type UserRole = 'tutee' | 'tutor';

export type Subject = { code: string; name: string };

export type Person = { id: string; name: string };

export type StatusEvent = {
  status: SessionStatus;
  /** Fecha ISO en que se registró el cambio de estado. */
  at: string;
};

export type Session = {
  id: string;
  subject: Subject;
  tutor: Person & { reputation: number | null; ratingsCount: number };
  tutee: Person;
  /** Rol que cumple el usuario actual dentro de esta sesión. */
  myRole: UserRole;
  status: SessionStatus;
  createdAt: string;
  startsAt: string;
  endsAt: string;
  /** Calificación que el usuario actual entregó (1 a 5, entero: BR19). */
  myRating?: number;
  /** Calificación que el usuario actual recibió de la contraparte. */
  receivedRating?: number;
  events: StatusEvent[];
};

export type AvailabilityBlock = { id: string; startsAt: string; endsAt: string };

export type TutorProfile = {
  id: string;
  name: string;
  reputation: number | null;
  ratingsCount: number;
  subjects: Subject[];
  availability: AvailabilityBlock[];
};
