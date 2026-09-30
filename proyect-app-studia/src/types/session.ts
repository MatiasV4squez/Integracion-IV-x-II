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

/** Resultados que un participante puede declarar al cerrar la sesión (BR17). */
export type ClosureResult = 'completada' | 'no_realizada' | 'inasistencia';

export type Subject = { code: string; name: string };
export type SubjectDetail = Subject & { area: string; units: string[] };

export type Person = { id: string; name: string };

export type StatusEvent = {
  status: SessionStatus;
  /** Fecha ISO en que se registró el cambio de estado. */
  at: string;
};

export type MaterialKind = 'guia' | 'ejercicios' | 'apuntes';

export type Material = {
  id: string;
  title: string;
  kind: MaterialKind;
  meta: string;
  uploadedBy: string;
};

export type Report = { reason: string; description: string; at: string };

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
  /** Bloque de disponibilidad reservado (si nació de una solicitud). */
  blockId?: string;
  /** Lugar de la tutoría (presencial). */
  place?: string;
  /** Unidad o tema abordado / a abordar. */
  topic?: string;
  /** Lo que el Tutee pidió reforzar al solicitar. */
  requestNote?: string;
  /** Resumen de lo trabajado en la sesión. */
  notes?: string;
  materials: Material[];
  /** Asistencia registrada con el QR de la sesión (ISO). Respalda la declaración de cierre. */
  attendance?: { mine?: string; theirs?: string };
  /** Declaraciones de cierre (BR17/BR18). */
  declaration?: { mine?: ClosureResult; theirs?: ClosureResult };
  /** Calificación que el usuario actual entregó (1 a 5, entero: BR19). */
  myRating?: number;
  myComment?: string;
  /** Calificación que el usuario actual recibió de la contraparte. */
  receivedRating?: number;
  report?: Report;
  events: StatusEvent[];
};

export type AvailabilityBlock = {
  id: string;
  startsAt: string;
  endsAt: string;
  /** Cupos máximos del bloque (1 = tutoría individual). */
  capacity: number;
  /** Inscritos actuales. */
  enrolled: number;
};

/** Horario que el propio Tutor publica (reserva) para dictar tutoría. */
export type MyAvailabilityBlock = AvailabilityBlock & { subjectCode: string };

export type Review = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  subjectCode: string;
};

export type Tutor = {
  id: string;
  name: string;
  career: string;
  semester: number;
  bio: string;
  verified: boolean;
  reputation: number | null;
  ratingsCount: number;
  subjectCodes: string[];
  stats: { sessions: number; hours: number; responseTime: string; repeatRate: number };
  bySubject: { code: string; sessions: number }[];
  recent: { subjectCode: string; date: string; rating: number }[];
  reviews: Review[];
  availability: AvailabilityBlock[];
};
