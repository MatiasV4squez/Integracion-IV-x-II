import type { AvailabilityBlock, Review, Tutor } from '@/types/session';

/** ISO con offset de Chile: d('09-30', '16:00') -> 2026-09-30T16:00:00-03:00 */
export const d = (day: string, hm: string) => `2026-${day}T${hm}:00-03:00`;

const block = (id: string, day: string, from: string, to: string, capacity = 1, enrolled = 0): AvailabilityBlock => ({
  id,
  startsAt: d(day, from),
  endsAt: d(day, to),
  capacity,
  enrolled,
});

const review = (id: string, author: string, rating: number, date: string, subjectCode: string, comment: string): Review => ({
  id,
  author,
  rating,
  date: d(date, '12:00'),
  subjectCode,
  comment,
});

export const TUTORS: Tutor[] = [
  {
    id: 't1', name: 'Camila Rojas', career: 'Ing. Civil Informática', semester: 6, verified: true,
    bio: 'Ayudante de Cálculo y Álgebra dos semestres seguidos. Me gusta explicar con ejemplos paso a paso y dejar ejercicios para practicar después.',
    reputation: 4.8, ratingsCount: 23, subjectCodes: ['MAT1010', 'MAT1020'],
    stats: { sessions: 41, hours: 52, responseTime: '~2 h', repeatRate: 68 },
    bySubject: [{ code: 'MAT1010', sessions: 27 }, { code: 'MAT1020', sessions: 14 }],
    recent: [
      { subjectCode: 'MAT1010', date: d('09-24', '16:00'), rating: 5 },
      { subjectCode: 'MAT1020', date: d('09-21', '11:00'), rating: 5 },
      { subjectCode: 'MAT1010', date: d('09-18', '10:00'), rating: 4 },
    ],
    reviews: [
      review('r1', 'Antonia R.', 5, '09-24', 'MAT1010', 'Me explicó la regla de la cadena de una forma que por fin entendí. Llegó con guía y ejercicios listos.'),
      review('r2', 'Bastián C.', 5, '09-21', 'MAT1020', 'Muy paciente y ordenada. Repasamos valores propios con varios ejemplos.'),
      review('r3', 'Josefa L.', 4, '09-18', 'MAT1010', 'Excelente tutoría, solo faltó un poco más de tiempo para integrales.'),
      review('r4', 'Tomás A.', 5, '09-10', 'MAT1010', 'Recomendadísima, subió apuntes después de la sesión.'),
    ],
    availability: [
      block('t1-b1', '09-29', '16:00', '17:00'),
      block('t1-b2', '09-29', '17:00', '18:00', 3, 1),
      block('t1-b3', '09-30', '10:00', '11:00', 3, 3),
      block('t1-b4', '10-01', '15:00', '16:00'),
      block('t1-b5', '10-02', '09:00', '10:00', 2, 1),
    ],
  },
  {
    id: 't2', name: 'Diego Soto', career: 'Ing. Civil Industrial', semester: 7, verified: true,
    bio: 'Me especializo en Física y Estadística. Prefiero resolver ejercicios tipo prueba y revisar errores comunes.',
    reputation: 4.2, ratingsCount: 9, subjectCodes: ['FIS1002', 'MAT1010', 'EST1010'],
    stats: { sessions: 18, hours: 21, responseTime: '~5 h', repeatRate: 44 },
    bySubject: [{ code: 'FIS1002', sessions: 10 }, { code: 'MAT1010', sessions: 5 }, { code: 'EST1010', sessions: 3 }],
    recent: [
      { subjectCode: 'FIS1002', date: d('09-22', '16:00'), rating: 4 },
      { subjectCode: 'EST1010', date: d('09-15', '15:00'), rating: 5 },
    ],
    reviews: [
      review('r5', 'Alumno D.', 4, '09-22', 'FIS1002', 'Buena explicación de cinemática, con ejercicios parecidos a los de la prueba.'),
      review('r6', 'Camilo P.', 5, '09-15', 'EST1010', 'Aclaró mis dudas de probabilidades en una hora.'),
      review('r7', 'Renata S.', 3, '09-05', 'MAT1010', 'Sabe mucho, aunque fue algo rápido para explicar.'),
    ],
    availability: [
      block('t2-b1', '09-30', '10:00', '11:00'),
      block('t2-b2', '10-01', '18:00', '19:00', 4, 2),
      block('t2-b3', '10-02', '12:00', '13:00'),
    ],
  },
  {
    id: 't3', name: 'Valentina Muñoz', career: 'Ing. Civil Informática', semester: 8, verified: true,
    bio: 'Recién me habilité como tutora. Trabajo en desarrollo web y bases de datos, y me gusta enseñar con código de ejemplo.',
    reputation: null, ratingsCount: 0, subjectCodes: ['INFO1120', 'INFO1140'],
    stats: { sessions: 0, hours: 0, responseTime: '~1 h', repeatRate: 0 },
    bySubject: [], recent: [], reviews: [],
    availability: [block('t3-b1', '09-29', '19:00', '20:00'), block('t3-b2', '10-01', '17:00', '18:00', 3, 0)],
  },
  {
    id: 't4', name: 'Ignacio Vera', career: 'Ing. Civil Informática', semester: 9, verified: true,
    bio: 'Ayudante de Programación y Bases de Datos. Reviso código, hago debugging en vivo y dejo ejercicios graduados por dificultad.',
    reputation: 4.9, ratingsCount: 31, subjectCodes: ['INFO1120', 'INFO1140', 'EST1010'],
    stats: { sessions: 64, hours: 80, responseTime: '~1 h', repeatRate: 74 },
    bySubject: [{ code: 'INFO1120', sessions: 38 }, { code: 'INFO1140', sessions: 20 }, { code: 'EST1010', sessions: 6 }],
    recent: [
      { subjectCode: 'INFO1120', date: d('09-26', '18:00'), rating: 5 },
      { subjectCode: 'INFO1140', date: d('09-23', '17:00'), rating: 5 },
      { subjectCode: 'INFO1120', date: d('09-20', '16:00'), rating: 5 },
    ],
    reviews: [
      review('r8', 'Felipe N.', 5, '09-26', 'INFO1120', 'Me sacó de un bloqueo con recursión. Muy claro y con mucha paciencia.'),
      review('r9', 'Josefa L.', 5, '09-23', 'INFO1140', 'Explicó normalización con ejemplos reales, súper útil para el certamen.'),
      review('r10', 'Martín L.', 5, '09-20', 'INFO1120', 'El mejor tutor de programación. Dejó ejercicios para seguir practicando.'),
      review('r11', 'Sofía A.', 4, '09-12', 'INFO1140', 'Muy buena tutoría, hay que reservar con tiempo porque se llena.'),
    ],
    availability: [
      block('t4-b1', '09-30', '18:00', '19:00', 3, 2),
      block('t4-b2', '10-01', '16:00', '17:00'),
      block('t4-b3', '10-03', '10:00', '11:00', 5, 1),
    ],
  },
  {
    id: 't5', name: 'Sofía Araya', career: 'Ing. en Biotecnología', semester: 7, verified: true,
    bio: 'Tutora de Química y Estadística. Me apoyo en esquemas y tablas para que los conceptos queden ordenados.',
    reputation: 4.6, ratingsCount: 14, subjectCodes: ['QUI1001', 'EST1010', 'FIS1002'],
    stats: { sessions: 29, hours: 33, responseTime: '~3 h', repeatRate: 59 },
    bySubject: [{ code: 'QUI1001', sessions: 17 }, { code: 'EST1010', sessions: 9 }, { code: 'FIS1002', sessions: 3 }],
    recent: [
      { subjectCode: 'QUI1001', date: d('09-25', '15:00'), rating: 5 },
      { subjectCode: 'EST1010', date: d('09-19', '11:00'), rating: 4 },
    ],
    reviews: [
      review('r12', 'Lucas M.', 5, '09-25', 'QUI1001', 'Estequiometría por fin tiene sentido. Muy ordenada.'),
      review('r13', 'Paula G.', 4, '09-19', 'EST1010', 'Buenos ejemplos de distribuciones, faltó tiempo para inferencia.'),
    ],
    availability: [
      block('t5-b1', '10-01', '11:00', '12:00'),
      block('t5-b2', '10-02', '15:00', '16:00', 3, 0),
      block('t5-b3', '10-03', '12:00', '13:00'),
    ],
  },
  {
    id: 't6', name: 'Martín Lagos', career: 'Ing. Civil Mecánica', semester: 8, verified: false,
    bio: 'Tutor de Física y Química. Estoy en proceso de validación de mi certificado de notas.',
    reputation: 3.9, ratingsCount: 6, subjectCodes: ['FIS1002', 'QUI1001', 'MAT1020'],
    stats: { sessions: 9, hours: 10, responseTime: '~8 h', repeatRate: 22 },
    bySubject: [{ code: 'FIS1002', sessions: 6 }, { code: 'QUI1001', sessions: 3 }],
    recent: [{ subjectCode: 'FIS1002', date: d('09-14', '17:00'), rating: 4 }],
    reviews: [
      review('r14', 'Diego S.', 4, '09-14', 'FIS1002', 'Buena disposición, hay que preparar dudas concretas.'),
      review('r15', 'Ana V.', 3, '09-02', 'QUI1001', 'Se atrasó unos minutos pero la explicación fue correcta.'),
    ],
    availability: [block('t6-b1', '09-29', '12:00', '13:00'), block('t6-b2', '10-02', '17:00', '18:00', 2, 2)],
  },
];

export function getTutorById(id?: string): Tutor | undefined {
  return TUTORS.find((t) => t.id === id);
}

export function tutorsForSubject(code: string): Tutor[] {
  return TUTORS.filter((t) => t.subjectCodes.includes(code)).sort(
    (a, b) => (b.reputation ?? 0) - (a.reputation ?? 0),
  );
}
