/**
 * Datos de ejemplo para maquetar. Se reemplazan por llamadas al API Gateway
 * cuando las pantallas se conecten al backend.
 */
import { getSubject } from '@/mocks/subjects';
import { d, getTutorById } from '@/mocks/tutors';
import type { ClosureResult, Material, Person, Session, SessionStatus, UserRole } from '@/types/session';

/** "Ahora" fijo para que la demo sea siempre igual. */
export const MOCK_NOW = d('09-28', '12:00');

/** Usuario actual de la demo. */
export const ME: Person = { id: 'u-me', name: 'Alumno Demo' };
const ME_AS_TUTOR = { ...ME, reputation: 4.5, ratingsCount: 12 };

const STUDENTS: Record<string, Person> = {
  's1': { id: 'u-s1', name: 'Javier Pino' },
  's2': { id: 'u-s2', name: 'Antonia Reyes' },
  's3': { id: 'u-s3', name: 'Felipe Neira' },
  's4': { id: 'u-s4', name: 'Bastián Coloma' },
  's5': { id: 'u-s5', name: 'Josefa Leiva' },
};

const mat = (id: string, title: string, kind: Material['kind'], meta: string, uploadedBy: string): Material => ({
  id, title, kind, meta, uploadedBy,
});

const PLACES = [
  'Biblioteca UCT · Cubículo 3',
  'Campus San Juan Pablo II · Sala 204',
  'Biblioteca UCT · Sala de estudio',
  'Campus Menchaca Lira · Lab. 2',
];

type Seed = {
  place?: string;
  id: string;
  status: SessionStatus;
  role: UserRole;
  subject: string;
  /** Id de Tutor (si soy Tutee) o de estudiante (si soy Tutor). */
  other: string;
  created: string;
  start: string;
  end: string;
  events: [SessionStatus, string][];
  blockId?: string;
  topic?: string;
  requestNote?: string;
  notes?: string;
  materials?: Material[];
  declaration?: { mine?: ClosureResult; theirs?: ClosureResult };
  myRating?: number;
  myComment?: string;
  receivedRating?: number;
};

function build(seed: Seed): Session {
  const subject = getSubject(seed.subject);
  if (!subject) throw new Error(`Materia desconocida: ${seed.subject}`);
  const iAmTutee = seed.role === 'tutee';
  const tutorData = iAmTutee ? getTutorById(seed.other) : undefined;

  return {
    id: seed.id,
    subject: { code: subject.code, name: subject.name },
    myRole: seed.role,
    status: seed.status,
    createdAt: seed.created,
    startsAt: seed.start,
    endsAt: seed.end,
    blockId: seed.blockId,
    place: seed.place ?? PLACES[Number(seed.id.replace(/\D/g, '')) % PLACES.length],
    topic: seed.topic,
    requestNote: seed.requestNote,
    notes: seed.notes,
    materials: seed.materials ?? [],
    declaration: seed.declaration,
    myRating: seed.myRating,
    myComment: seed.myComment,
    receivedRating: seed.receivedRating,
    tutor: iAmTutee
      ? { id: seed.other, name: tutorData?.name ?? 'Tutor', reputation: tutorData?.reputation ?? null, ratingsCount: tutorData?.ratingsCount ?? 0 }
      : ME_AS_TUTOR,
    tutee: iAmTutee ? ME : (STUDENTS[seed.other] ?? { id: seed.other, name: 'Estudiante' }),
    events: seed.events.map(([status, at]) => ({ status, at })),
  };
}

export const MOCK_SESSIONS: Session[] = [
  build({
    id: 's1', status: 'pendiente', role: 'tutee', subject: 'MAT1010', other: 't1', blockId: 't1-b1',
    created: d('09-28', '10:00'), start: d('09-29', '16:00'), end: d('09-29', '17:00'),
    topic: 'Derivadas', requestNote: 'Necesito repasar la regla de la cadena antes del certamen.',
    events: [['pendiente', d('09-28', '10:00')]],
  }),
  build({
    id: 's14', status: 'pendiente', role: 'tutee', subject: 'EST1010', other: 't5', blockId: 't5-b1',
    created: d('09-28', '08:30'), start: d('10-01', '11:00'), end: d('10-01', '12:00'),
    topic: 'Probabilidades',
    events: [['pendiente', d('09-28', '08:30')]],
  }),
  build({
    id: 's2', status: 'pendiente', role: 'tutor', subject: 'INFO1120', other: 's1',
    created: d('09-28', '09:30'), start: d('09-30', '18:00'), end: d('09-30', '19:00'),
    topic: 'Recursión', requestNote: 'No entiendo cómo trazar una función recursiva.',
    events: [['pendiente', d('09-28', '09:30')]],
  }),
  build({
    id: 's3', status: 'confirmada', role: 'tutee', subject: 'FIS1002', other: 't2', blockId: 't2-b1',
    created: d('09-26', '15:00'), start: d('09-30', '10:00'), end: d('09-30', '11:00'),
    topic: 'Trabajo y energía',
    materials: [mat('m1', 'Guía 3: Trabajo y energía', 'guia', 'PDF · 1.1 MB', 'Diego Soto')],
    events: [['pendiente', d('09-26', '15:00')], ['confirmada', d('09-26', '18:20')]],
  }),
  build({
    id: 's4', status: 'confirmada', role: 'tutor', subject: 'MAT1020', other: 's2',
    created: d('09-27', '11:00'), start: d('09-28', '18:00'), end: d('09-28', '19:00'),
    topic: 'Matrices y sistemas',
    events: [['pendiente', d('09-27', '11:00')], ['confirmada', d('09-27', '13:45')]],
  }),
  build({
    id: 's5', status: 'pendiente_cierre', role: 'tutee', subject: 'MAT1010', other: 't1',
    created: d('09-25', '09:00'), start: d('09-27', '17:00'), end: d('09-27', '18:00'),
    topic: 'Límites y continuidad',
    materials: [mat('m2', 'Ejercicios: límites', 'ejercicios', 'PDF · 420 KB', 'Camila Rojas')],
    events: [['pendiente', d('09-25', '09:00')], ['confirmada', d('09-25', '12:10')], ['pendiente_cierre', d('09-27', '18:00')]],
  }),
  build({
    id: 's6', status: 'en_conflicto', role: 'tutor', subject: 'INFO1120', other: 's3',
    created: d('09-22', '09:00'), start: d('09-25', '15:00'), end: d('09-25', '16:00'),
    topic: 'Estructuras de datos', declaration: { mine: 'completada', theirs: 'inasistencia' },
    events: [['pendiente', d('09-22', '09:00')], ['confirmada', d('09-22', '10:30')], ['pendiente_cierre', d('09-25', '16:00')], ['en_conflicto', d('09-26', '09:15')]],
  }),
  build({
    id: 's7', status: 'completada', role: 'tutee', subject: 'FIS1002', other: 't2',
    created: d('09-18', '09:00'), start: d('09-22', '16:00'), end: d('09-22', '17:00'),
    topic: 'Cinemática', myRating: 5, receivedRating: 4,
    myComment: 'Muy buena explicación de MRU y MRUA, con ejercicios tipo prueba.',
    notes: 'Repasamos MRU y MRUA con la guía 2. Quedaron pendientes los problemas de lanzamiento vertical (ejercicios 7 al 10).',
    materials: [
      mat('m3', 'Guía 2: Cinemática', 'guia', 'PDF · 1.4 MB', 'Diego Soto'),
      mat('m4', 'Ejercicios propuestos', 'ejercicios', 'PDF · 320 KB', 'Diego Soto'),
    ],
    events: [['pendiente', d('09-18', '09:00')], ['confirmada', d('09-18', '11:00')], ['pendiente_cierre', d('09-22', '17:00')], ['completada', d('09-22', '19:30')]],
  }),
  build({
    id: 's8', status: 'completada', role: 'tutor', subject: 'MAT1020', other: 's4',
    created: d('09-15', '09:00'), start: d('09-20', '11:00'), end: d('09-20', '12:00'),
    topic: 'Valores propios', receivedRating: 5,
    notes: 'Cálculo de valores y vectores propios de matrices 2x2 y 3x3. Se recomendó practicar diagonalización.',
    materials: [mat('m5', 'Apuntes: valores propios', 'apuntes', 'PDF · 890 KB', 'Alumno Demo')],
    events: [['pendiente', d('09-15', '09:00')], ['confirmada', d('09-15', '10:00')], ['pendiente_cierre', d('09-20', '12:00')], ['completada', d('09-20', '14:00')]],
  }),
  build({
    id: 's9', status: 'cancelada', role: 'tutee', subject: 'MAT1010', other: 't1',
    created: d('09-14', '09:00'), start: d('09-18', '10:00'), end: d('09-18', '11:00'), topic: 'Integrales',
    events: [['pendiente', d('09-14', '09:00')], ['confirmada', d('09-14', '12:00')], ['cancelada', d('09-17', '20:00')]],
  }),
  build({
    id: 's10', status: 'rechazada', role: 'tutee', subject: 'INFO1120', other: 't3',
    created: d('09-12', '09:00'), start: d('09-16', '15:00'), end: d('09-16', '16:00'), topic: 'Funciones',
    events: [['pendiente', d('09-12', '09:00')], ['rechazada', d('09-12', '15:00')]],
  }),
  build({
    id: 's11', status: 'expirada', role: 'tutee', subject: 'EST1010', other: 't2',
    created: d('09-10', '09:00'), start: d('09-14', '09:00'), end: d('09-14', '10:00'), topic: 'Distribuciones',
    events: [['pendiente', d('09-10', '09:00')], ['expirada', d('09-11', '09:05')]],
  }),
  build({
    id: 's12', status: 'no_realizada', role: 'tutor', subject: 'FIS1002', other: 's5',
    created: d('09-05', '09:00'), start: d('09-09', '17:00'), end: d('09-09', '18:00'), topic: 'Dinámica',
    events: [['pendiente', d('09-05', '09:00')], ['confirmada', d('09-05', '10:00')], ['pendiente_cierre', d('09-09', '18:00')], ['no_realizada', d('09-09', '20:00')]],
  }),
  build({
    id: 's13', status: 'inasistencia', role: 'tutee', subject: 'MAT1010', other: 't2',
    created: d('09-01', '09:00'), start: d('09-04', '10:00'), end: d('09-04', '11:00'), topic: 'Límites y continuidad',
    events: [['pendiente', d('09-01', '09:00')], ['confirmada', d('09-01', '10:00')], ['pendiente_cierre', d('09-04', '11:00')], ['inasistencia', d('09-04', '13:00')]],
  }),
];
