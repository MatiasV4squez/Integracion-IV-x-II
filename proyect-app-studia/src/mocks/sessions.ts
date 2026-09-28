/**
 * Datos de ejemplo para maquetar. Se reemplazan por llamadas al API Gateway
 * cuando las pantallas se conecten al backend.
 */
import type { Session, SessionStatus, StatusEvent, TutorProfile, UserRole } from '@/types/session';

/** "Ahora" fijo para que las vistas previas sean siempre iguales. */
export const MOCK_NOW = '2026-09-28T12:00:00-03:00';
/** Solicitudes pendientes actuales del usuario demo (BR05: máximo 4). */
export const MOCK_PENDING_COUNT = 2;

const ME = { id: 'u-me', name: 'Alumno Demo' };
const CAMILA = { id: 'u-1', name: 'Camila Rojas', reputation: 4.8, ratingsCount: 23 };
const DIEGO = { id: 'u-2', name: 'Diego Soto', reputation: 4.2, ratingsCount: 9 };
const VALENTINA = { id: 'u-3', name: 'Valentina Muñoz', reputation: null, ratingsCount: 0 };

const CALCULO = { code: 'MAT1010', name: 'Cálculo I' };
const PROGRAMACION = { code: 'INFO1120', name: 'Programación' };
const FISICA = { code: 'FIS1002', name: 'Física General' };
const ALGEBRA = { code: 'MAT1020', name: 'Álgebra Lineal' };

type Seed = {
  id: string;
  status: SessionStatus;
  role: UserRole;
  subject: Session['subject'];
  other: { id: string; name: string };
  createdAt: string;
  start: string;
  end: string;
  events: StatusEvent[];
  myRating?: number;
  receivedRating?: number;
};

function build(seed: Seed): Session {
  const tutorData = [CAMILA, DIEGO, VALENTINA].find((t) => t.id === seed.other.id);
  const iAmTutee = seed.role === 'tutee';
  return {
    id: seed.id,
    subject: seed.subject,
    myRole: seed.role,
    status: seed.status,
    createdAt: seed.createdAt,
    startsAt: seed.start,
    endsAt: seed.end,
    tutor: iAmTutee
      ? { id: seed.other.id, name: seed.other.name, reputation: tutorData?.reputation ?? null, ratingsCount: tutorData?.ratingsCount ?? 0 }
      : { ...ME, reputation: 4.5, ratingsCount: 12 },
    tutee: iAmTutee ? ME : seed.other,
    myRating: seed.myRating,
    receivedRating: seed.receivedRating,
    events: seed.events,
  };
}

export const MOCK_SESSIONS: Session[] = [
  build({
    id: 's1', status: 'pendiente', role: 'tutee', subject: CALCULO, other: CAMILA,
    createdAt: '2026-09-28T10:00:00-03:00', start: '2026-09-29T16:00:00-03:00', end: '2026-09-29T17:00:00-03:00',
    events: [{ status: 'pendiente', at: '2026-09-28T10:00:00-03:00' }],
  }),
  build({
    id: 's2', status: 'pendiente', role: 'tutor', subject: PROGRAMACION, other: { id: 'u-9', name: 'Javier Pino' },
    createdAt: '2026-09-28T09:30:00-03:00', start: '2026-09-30T18:00:00-03:00', end: '2026-09-30T19:00:00-03:00',
    events: [{ status: 'pendiente', at: '2026-09-28T09:30:00-03:00' }],
  }),
  build({
    id: 's3', status: 'confirmada', role: 'tutee', subject: FISICA, other: DIEGO,
    createdAt: '2026-09-26T15:00:00-03:00', start: '2026-09-30T10:00:00-03:00', end: '2026-09-30T11:00:00-03:00',
    events: [
      { status: 'pendiente', at: '2026-09-26T15:00:00-03:00' },
      { status: 'confirmada', at: '2026-09-26T18:20:00-03:00' },
    ],
  }),
  build({
    id: 's4', status: 'confirmada', role: 'tutor', subject: ALGEBRA, other: { id: 'u-10', name: 'Sofía Araya' },
    createdAt: '2026-09-27T11:00:00-03:00', start: '2026-09-28T18:00:00-03:00', end: '2026-09-28T19:00:00-03:00',
    events: [
      { status: 'pendiente', at: '2026-09-27T11:00:00-03:00' },
      { status: 'confirmada', at: '2026-09-27T13:45:00-03:00' },
    ],
  }),
  build({
    id: 's5', status: 'pendiente_cierre', role: 'tutee', subject: CALCULO, other: CAMILA,
    createdAt: '2026-09-25T09:00:00-03:00', start: '2026-09-27T17:00:00-03:00', end: '2026-09-27T18:00:00-03:00',
    events: [
      { status: 'pendiente', at: '2026-09-25T09:00:00-03:00' },
      { status: 'confirmada', at: '2026-09-25T12:10:00-03:00' },
      { status: 'pendiente_cierre', at: '2026-09-27T18:00:00-03:00' },
    ],
  }),
  build({
    id: 's6', status: 'en_conflicto', role: 'tutor', subject: PROGRAMACION, other: { id: 'u-11', name: 'Felipe Neira' },
    createdAt: '2026-09-22T09:00:00-03:00', start: '2026-09-25T15:00:00-03:00', end: '2026-09-25T16:00:00-03:00',
    events: [
      { status: 'pendiente', at: '2026-09-22T09:00:00-03:00' },
      { status: 'confirmada', at: '2026-09-22T10:30:00-03:00' },
      { status: 'pendiente_cierre', at: '2026-09-25T16:00:00-03:00' },
      { status: 'en_conflicto', at: '2026-09-26T09:15:00-03:00' },
    ],
  }),
  build({
    id: 's7', status: 'completada', role: 'tutee', subject: FISICA, other: DIEGO,
    createdAt: '2026-09-18T09:00:00-03:00', start: '2026-09-22T16:00:00-03:00', end: '2026-09-22T17:00:00-03:00',
    myRating: 5, receivedRating: 4,
    events: [
      { status: 'pendiente', at: '2026-09-18T09:00:00-03:00' },
      { status: 'confirmada', at: '2026-09-18T11:00:00-03:00' },
      { status: 'pendiente_cierre', at: '2026-09-22T17:00:00-03:00' },
      { status: 'completada', at: '2026-09-22T19:30:00-03:00' },
    ],
  }),
  build({
    id: 's8', status: 'completada', role: 'tutor', subject: ALGEBRA, other: { id: 'u-12', name: 'Ignacio Vera' },
    createdAt: '2026-09-15T09:00:00-03:00', start: '2026-09-20T11:00:00-03:00', end: '2026-09-20T12:00:00-03:00',
    receivedRating: 5,
    events: [
      { status: 'pendiente', at: '2026-09-15T09:00:00-03:00' },
      { status: 'confirmada', at: '2026-09-15T10:00:00-03:00' },
      { status: 'pendiente_cierre', at: '2026-09-20T12:00:00-03:00' },
      { status: 'completada', at: '2026-09-20T14:00:00-03:00' },
    ],
  }),
  build({
    id: 's9', status: 'cancelada', role: 'tutee', subject: CALCULO, other: CAMILA,
    createdAt: '2026-09-14T09:00:00-03:00', start: '2026-09-18T10:00:00-03:00', end: '2026-09-18T11:00:00-03:00',
    events: [
      { status: 'pendiente', at: '2026-09-14T09:00:00-03:00' },
      { status: 'confirmada', at: '2026-09-14T12:00:00-03:00' },
      { status: 'cancelada', at: '2026-09-17T20:00:00-03:00' },
    ],
  }),
  build({
    id: 's10', status: 'rechazada', role: 'tutee', subject: PROGRAMACION, other: VALENTINA,
    createdAt: '2026-09-12T09:00:00-03:00', start: '2026-09-16T15:00:00-03:00', end: '2026-09-16T16:00:00-03:00',
    events: [
      { status: 'pendiente', at: '2026-09-12T09:00:00-03:00' },
      { status: 'rechazada', at: '2026-09-12T15:00:00-03:00' },
    ],
  }),
  build({
    id: 's11', status: 'expirada', role: 'tutee', subject: ALGEBRA, other: DIEGO,
    createdAt: '2026-09-10T09:00:00-03:00', start: '2026-09-14T09:00:00-03:00', end: '2026-09-14T10:00:00-03:00',
    events: [
      { status: 'pendiente', at: '2026-09-10T09:00:00-03:00' },
      { status: 'expirada', at: '2026-09-11T09:05:00-03:00' },
    ],
  }),
  build({
    id: 's12', status: 'no_realizada', role: 'tutor', subject: FISICA, other: { id: 'u-13', name: 'Martín Lagos' },
    createdAt: '2026-09-05T09:00:00-03:00', start: '2026-09-09T17:00:00-03:00', end: '2026-09-09T18:00:00-03:00',
    events: [
      { status: 'pendiente', at: '2026-09-05T09:00:00-03:00' },
      { status: 'confirmada', at: '2026-09-05T10:00:00-03:00' },
      { status: 'pendiente_cierre', at: '2026-09-09T18:00:00-03:00' },
      { status: 'no_realizada', at: '2026-09-09T20:00:00-03:00' },
    ],
  }),
  build({
    id: 's13', status: 'inasistencia', role: 'tutee', subject: CALCULO, other: DIEGO,
    createdAt: '2026-09-01T09:00:00-03:00', start: '2026-09-04T10:00:00-03:00', end: '2026-09-04T11:00:00-03:00',
    events: [
      { status: 'pendiente', at: '2026-09-01T09:00:00-03:00' },
      { status: 'confirmada', at: '2026-09-01T10:00:00-03:00' },
      { status: 'pendiente_cierre', at: '2026-09-04T11:00:00-03:00' },
      { status: 'inasistencia', at: '2026-09-04T13:00:00-03:00' },
    ],
  }),
];

export function getMockSessionById(id?: string): Session {
  return MOCK_SESSIONS.find((s) => s.id === id) ?? MOCK_SESSIONS[2];
}

export const MOCK_TUTOR: TutorProfile = {
  id: CAMILA.id,
  name: CAMILA.name,
  reputation: CAMILA.reputation,
  ratingsCount: CAMILA.ratingsCount,
  subjects: [CALCULO, ALGEBRA],
  availability: [
    { id: 'b1', startsAt: '2026-09-29T16:00:00-03:00', endsAt: '2026-09-29T17:00:00-03:00' },
    { id: 'b2', startsAt: '2026-09-29T17:00:00-03:00', endsAt: '2026-09-29T18:00:00-03:00' },
    { id: 'b3', startsAt: '2026-09-30T10:00:00-03:00', endsAt: '2026-09-30T11:00:00-03:00' },
    { id: 'b4', startsAt: '2026-10-01T15:00:00-03:00', endsAt: '2026-10-01T16:00:00-03:00' },
    { id: 'b5', startsAt: '2026-10-01T16:00:00-03:00', endsAt: '2026-10-01T17:00:00-03:00' },
    { id: 'b6', startsAt: '2026-10-02T09:00:00-03:00', endsAt: '2026-10-02T10:00:00-03:00' },
  ],
};
