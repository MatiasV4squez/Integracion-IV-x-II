import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clasesActivas, conteoHistorial, historialPorRol, historialReciente, proximaClase, resumenEstudiante, resumenTutor, sesionesAgendadasTutor } from './resumen-agenda.ts';

const s = (id, myRole, status, startsAt) => ({ id, myRole, status, startsAt, endsAt: startsAt.replace('T10', 'T11'), events: [] });
const NOW = '2026-11-02T12:00:00-03:00';
const SESSIONS = [
  s('a', 'tutee', 'confirmada', '2026-11-05T10:00:00-03:00'),
  s('b', 'tutee', 'confirmada', '2026-11-03T10:00:00-03:00'),
  s('c', 'tutee', 'confirmada', '2026-11-01T10:00:00-03:00'),
  s('d', 'tutee', 'cancelada', '2026-11-03T10:00:00-03:00'),
  s('e', 'tutee', 'pendiente', '2026-11-04T10:00:00-03:00'),
  s('f', 'tutor', 'pendiente', '2026-11-06T10:00:00-03:00'),
  s('g', 'tutor', 'pendiente', '2026-11-04T10:00:00-03:00'),
  s('h', 'tutor', 'confirmada', '2026-11-07T10:00:00-03:00'),
  s('i', 'tutor', 'completada', '2026-10-20T10:00:00-03:00'),
];

describe('resumen de agenda', () => {
  it('la próxima clase es la confirmada más cercana que no terminó', () => {
    assert.equal(proximaClase(SESSIONS, NOW)?.id, 'b');
    assert.equal(proximaClase([], NOW), null);
  });

  it('las clases activas del estudiante excluyen finales y las del rol tutor', () => {
    assert.deepEqual(clasesActivas(SESSIONS).map((x) => x.id), ['c', 'b', 'e', 'a']);
  });

  it('el tutor ve sus solicitudes pendientes, próxima sesión, bloques libres y completadas', () => {
    const blocks = [
      { id: '1', startsAt: '2026-11-03T09:00:00-03:00', endsAt: '', capacity: 1, enrolled: 0 },
      { id: '2', startsAt: '2026-11-03T15:00:00-03:00', endsAt: '', capacity: 1, enrolled: 1 },
      { id: '3', startsAt: '2026-11-01T09:00:00-03:00', endsAt: '', capacity: 1, enrolled: 0 },
    ];
    const r = resumenTutor(SESSIONS, blocks, NOW);
    assert.deepEqual(r.solicitudes.map((x) => x.id), ['g', 'f']);
    assert.equal(r.proxima?.id, 'h');
    assert.equal(r.bloquesDisponibles, 1);
    assert.equal(r.completadas, 1);
  });

  it('el estudiante ve cuántas solicitudes tiene pendientes, confirmadas y completadas', () => {
    const extra = [...SESSIONS, s('j', 'tutee', 'completada', '2026-10-20T10:00:00-03:00')];
    assert.deepEqual(resumenEstudiante(extra), { pendientes: 1, confirmadas: 3, completadas: 1 });
  });

  it('el historial reciente muestra solo clases terminadas del estudiante, la más nueva primero', () => {
    const extra = [
      ...SESSIONS,
      s('j', 'tutee', 'completada', '2026-10-20T10:00:00-03:00'),
      s('k', 'tutee', 'expirada', '2026-10-25T10:00:00-03:00'),
    ];
    assert.deepEqual(historialReciente(extra).map((x) => x.id), ['d', 'k', 'j']);
    assert.equal(historialReciente(extra, 1).length, 1);
  });

  it('el historial del estudiante filtra por estado y ordena de la más reciente a la más antigua', () => {
    assert.deepEqual(historialPorRol(SESSIONS, 'tutee', 'todas').map((x) => x.id), ['a', 'e', 'b', 'd', 'c']);
    assert.deepEqual(historialPorRol(SESSIONS, 'tutee', 'en_curso').map((x) => x.id), ['a', 'e', 'b', 'c']);
    assert.deepEqual(historialPorRol(SESSIONS, 'tutee', 'completadas'), []);
    assert.deepEqual(historialPorRol(SESSIONS, 'tutee', 'otras').map((x) => x.id), ['d']);
    assert.deepEqual(conteoHistorial(SESSIONS, 'tutee'), { todas: 5, en_curso: 4, completadas: 0, otras: 1 });
  });

  it('en modo tutor el historial solo incluye las tutorías que dicta', () => {
    assert.deepEqual(historialPorRol(SESSIONS, 'tutor', 'todas').map((x) => x.id), ['h', 'f', 'g', 'i']);
    assert.deepEqual(conteoHistorial(SESSIONS, 'tutor'), { todas: 4, en_curso: 3, completadas: 1, otras: 0 });
    assert.deepEqual(historialReciente(SESSIONS, 3, 'tutor').map((x) => x.id), ['i']);
    assert.deepEqual(sesionesAgendadasTutor(SESSIONS).map((x) => x.id), ['h']);
  });
});
