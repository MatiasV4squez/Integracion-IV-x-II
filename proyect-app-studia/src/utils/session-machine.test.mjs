import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  adminResolve,
  checkIn,
  counterpartCheckIn,
  getCheckInPhase,
  startSessionNow,
  cancelSession,
  closureTimeout,
  counterpartDeclares,
  createRequest,
  declareResult,
  endSession,
  expireRequest,
  isBlockFull,
  rateSession,
  reportSession,
  resolveClosure,
  respondToRequest,
  addMaterial,
  canCancel,
  canCreateRequest,
  canTransition,
  getAvailableActions,
  hasReachedConfirmed,
  InvalidTransitionError,
  isFinal,
  requestExpiresAt,
  transition,
} from './session-machine.ts';
import { formatCountdown } from './format.ts';

const FINALS = ['rechazada', 'expirada', 'cancelada', 'completada', 'no_realizada', 'inasistencia'];

describe('BR02 - máquina de estados', () => {
  it('flujo feliz: pendiente -> confirmada -> pendiente_cierre -> completada', () => {
    let s = transition('pendiente', 'confirmada');
    s = transition(s, 'pendiente_cierre');
    s = transition(s, 'completada');
    assert.equal(s, 'completada');
    assert.equal(isFinal(s), true);
  });

  it('flujo de rechazo y de expiración terminan en estado final', () => {
    assert.equal(transition('pendiente', 'rechazada'), 'rechazada');
    assert.equal(transition('pendiente', 'expirada'), 'expirada');
  });

  it('flujo de cancelación desde confirmada', () => {
    assert.equal(transition('pendiente', 'confirmada'), 'confirmada');
    assert.equal(transition('confirmada', 'cancelada'), 'cancelada');
  });

  it('flujo de conflicto: pendiente_cierre -> en_conflicto -> resolución admin', () => {
    let s = transition('pendiente_cierre', 'en_conflicto');
    s = transition(s, 'inasistencia');
    assert.equal(isFinal(s), true);
  });

  it('CA07: los estados finales no admiten ninguna transición', () => {
    for (const final of FINALS) {
      assert.equal(isFinal(final), true, final);
      assert.equal(canTransition(final, 'pendiente'), false, `${final} -> pendiente`);
      assert.equal(canTransition(final, 'confirmada'), false, `${final} -> confirmada`);
    }
  });

  it('no permite saltarse estados ni retroceder', () => {
    assert.throws(() => transition('pendiente', 'completada'), InvalidTransitionError);
    assert.throws(() => transition('confirmada', 'completada'), InvalidTransitionError);
    assert.throws(() => transition('confirmada', 'pendiente'), InvalidTransitionError);
    assert.throws(() => transition('pendiente_cierre', 'confirmada'), InvalidTransitionError);
  });
});

describe('BR05 / RF11 - límite de solicitudes pendientes', () => {
  it('permite hasta 3 pendientes y bloquea desde 4', () => {
    assert.equal(canCreateRequest(0), true);
    assert.equal(canCreateRequest(3), true);
    assert.equal(canCreateRequest(4), false);
    assert.equal(canCreateRequest(5), false);
  });
});

describe('BR03 - expiración', () => {
  it('la solicitud expira 24 horas después de su creación', () => {
    assert.equal(requestExpiresAt('2026-09-28T10:00:00.000Z'), '2026-09-29T10:00:00.000Z');
  });
});

describe('BR15 - cancelación', () => {
  const startsAt = '2026-09-30T14:00:00.000Z';
  it('solo antes del inicio y solo si está confirmada', () => {
    assert.equal(canCancel('confirmada', startsAt, '2026-09-30T13:59:00.000Z'), true);
    assert.equal(canCancel('confirmada', startsAt, '2026-09-30T14:00:00.000Z'), false);
    assert.equal(canCancel('pendiente', startsAt, '2026-09-29T10:00:00.000Z'), false);
  });
});

describe('BR10 - reportes', () => {
  it('solo sesiones que alguna vez fueron confirmadas', () => {
    for (const s of ['pendiente', 'rechazada', 'expirada']) {
      assert.equal(hasReachedConfirmed(s), false, s);
    }
    for (const s of ['confirmada', 'cancelada', 'pendiente_cierre', 'completada', 'no_realizada', 'inasistencia', 'en_conflicto']) {
      assert.equal(hasReachedConfirmed(s), true, s);
    }
  });
});

describe('acciones disponibles por estado y rol', () => {
  const base = {
    startsAt: '2026-09-30T14:00:00.000Z',
    now: '2026-09-28T12:00:00.000Z',
    alreadyRated: false,
  };

  it('pendiente: solo el Tutor acepta/rechaza (BR14)', () => {
    assert.deepEqual(getAvailableActions({ ...base, status: 'pendiente', role: 'tutor' }), ['aceptar', 'rechazar']);
    assert.deepEqual(getAvailableActions({ ...base, status: 'pendiente', role: 'tutee' }), []);
  });

  it('confirmada antes del inicio: cancelar + reportar; después del inicio: solo reportar', () => {
    assert.deepEqual(getAvailableActions({ ...base, status: 'confirmada', role: 'tutee' }), ['cancelar', 'reportar']);
    assert.deepEqual(
      getAvailableActions({ ...base, now: '2026-09-30T14:30:00.000Z', status: 'confirmada', role: 'tutee' }),
      ['reportar'],
    );
  });

  it('pendiente_cierre: declarar resultado', () => {
    assert.deepEqual(getAvailableActions({ ...base, status: 'pendiente_cierre', role: 'tutor' }), [
      'declarar_resultado',
      'reportar',
    ]);
  });

  it('completada: calificar solo si aún no calificó (BR04)', () => {
    assert.deepEqual(getAvailableActions({ ...base, status: 'completada', role: 'tutee' }), ['calificar', 'reportar']);
    assert.deepEqual(getAvailableActions({ ...base, status: 'completada', role: 'tutee', alreadyRated: true }), [
      'reportar',
    ]);
  });

  it('en conflicto no permite calificar', () => {
    assert.deepEqual(getAvailableActions({ ...base, status: 'en_conflicto', role: 'tutee' }), ['reportar']);
  });

  it('rechazada / expirada no ofrecen ninguna acción', () => {
    assert.deepEqual(getAvailableActions({ ...base, status: 'rechazada', role: 'tutee' }), []);
    assert.deepEqual(getAvailableActions({ ...base, status: 'expirada', role: 'tutor' }), []);
  });
});

/* ------------------------- flujo completo ------------------------- */

const ME = { id: 'u-me', name: 'Alumno Demo' };
const TUTOR = { id: 't1', name: 'Camila Rojas', reputation: 4.8, ratingsCount: 23 };
const SUBJECT = { code: 'MAT1010', name: 'Cálculo I' };
const block = (id, capacity = 1, enrolled = 0) => ({
  id,
  startsAt: '2026-09-30T14:00:00.000Z',
  endsAt: '2026-09-30T15:00:00.000Z',
  capacity,
  enrolled,
});
const empty = () => ({ sessions: [], clock: '2026-09-28T12:00:00.000Z', reserved: {} });
const ok = (res) => {
  assert.equal(res.ok, true, res.ok ? '' : res.error);
  return res;
};
const request = (state, b = block('b1')) => createRequest(state, { tutor: TUTOR, me: ME, subject: SUBJECT, block: b });

describe('flujo completo de una sesión', () => {
  it('solicitud -> confirmada -> pendiente de cierre -> completada -> calificada', () => {
    let r = ok(request(empty()));
    const id = r.session.id;
    assert.equal(r.session.status, 'pendiente');

    r = ok(respondToRequest(r.state, id, true));
    assert.equal(r.session.status, 'confirmada');

    r = ok(endSession(r.state, id));
    assert.equal(r.session.status, 'pendiente_cierre');

    r = ok(declareResult(r.state, id, 'completada'));
    assert.equal(r.session.status, 'pendiente_cierre', 'la primera declaración deja pendiente al otro participante');

    r = ok(counterpartDeclares(r.state, id, 'completada'));
    assert.equal(r.session.status, 'completada');

    r = ok(rateSession(r.state, id, 5, 'Excelente'));
    assert.equal(r.session.myRating, 5);
    assert.deepEqual(
      r.session.events.map((e) => e.status),
      ['pendiente', 'confirmada', 'pendiente_cierre', 'completada'],
    );
  });

  it('declaraciones distintas -> en conflicto -> resuelve el administrador', () => {
    let r = ok(request(empty()));
    const id = r.session.id;
    r = ok(respondToRequest(r.state, id, true));
    r = ok(endSession(r.state, id));
    r = ok(declareResult(r.state, id, 'completada'));
    r = ok(counterpartDeclares(r.state, id, 'inasistencia'));
    assert.equal(r.session.status, 'en_conflicto');
    assert.equal(rateSession(r.state, id, 5).ok, false, 'no se califica en conflicto');
    r = ok(adminResolve(r.state, id, 'inasistencia'));
    assert.equal(r.session.status, 'inasistencia');
  });

  it('BR18: sin respuesta en 48 h se acepta la primera declaración', () => {
    let r = ok(request(empty()));
    const id = r.session.id;
    r = ok(respondToRequest(r.state, id, true));
    r = ok(endSession(r.state, id));
    assert.equal(closureTimeout(r.state, id).ok, false, 'sin declaraciones no hay nada que aceptar');
    r = ok(declareResult(r.state, id, 'no_realizada'));
    r = ok(closureTimeout(r.state, id));
    assert.equal(r.session.status, 'no_realizada');
  });

  it('no se puede declarar dos veces ni fuera de "pendiente de cierre"', () => {
    let r = ok(request(empty()));
    const id = r.session.id;
    assert.equal(declareResult(r.state, id, 'completada').ok, false);
    r = ok(respondToRequest(r.state, id, true));
    r = ok(endSession(r.state, id));
    r = ok(declareResult(r.state, id, 'completada'));
    assert.equal(declareResult(r.state, id, 'completada').ok, false);
  });

  it('rechazo y expiración liberan el cupo del bloque', () => {
    let r = ok(request(empty()));
    assert.equal(r.state.reserved.b1, 1);
    const id = r.session.id;
    r = ok(respondToRequest(r.state, id, false));
    assert.equal(r.session.status, 'rechazada');
    assert.equal(r.state.reserved.b1, 0);

    let e = ok(request(empty()));
    e = ok(expireRequest(e.state, e.session.id));
    assert.equal(e.session.status, 'expirada');
    assert.equal(e.state.reserved.b1, 0);
  });

  it('cancelar libera el cupo y solo antes del inicio (BR15)', () => {
    let r = ok(request(empty()));
    const id = r.session.id;
    r = ok(respondToRequest(r.state, id, true));
    const late = { ...r.state, clock: '2026-09-30T14:30:00.000Z' };
    assert.equal(cancelSession(late, id).ok, false);
    r = ok(cancelSession(r.state, id));
    assert.equal(r.session.status, 'cancelada');
    assert.equal(r.state.reserved.b1, 0);
  });

  it('BR05: la quinta solicitud pendiente es rechazada', () => {
    let state = empty();
    for (let i = 1; i <= 4; i++) state = ok(request(state, block(`b${i}`))).state;
    const fifth = request(state, block('b5'));
    assert.equal(fifth.ok, false);
    assert.match(fifth.error, /4 solicitudes pendientes/);
  });

  it('bloques con cupos: se llenan y no admiten solicitudes duplicadas', () => {
    const group = block('g1', 2, 1);
    assert.equal(isBlockFull(group), false);
    let r = ok(request(empty(), group));
    assert.equal(isBlockFull(group, r.state.reserved), true);
    assert.equal(request(r.state, group).ok, false);
    assert.equal(request(empty(), block('g2', 1, 1)).ok, false);
  });

  it('BR04 / BR19: una sola calificación entera de 1 a 5', () => {
    let r = ok(request(empty()));
    const id = r.session.id;
    r = ok(respondToRequest(r.state, id, true));
    r = ok(endSession(r.state, id));
    r = ok(declareResult(r.state, id, 'completada'));
    r = ok(counterpartDeclares(r.state, id, 'completada'));
    assert.equal(rateSession(r.state, id, 0).ok, false);
    assert.equal(rateSession(r.state, id, 6).ok, false);
    assert.equal(rateSession(r.state, id, 3.5).ok, false);
    r = ok(rateSession(r.state, id, 4));
    assert.equal(rateSession(r.state, id, 5).ok, false, 'no se puede calificar dos veces');
  });

  it('BR10: solo se reporta si la sesión llegó a confirmada', () => {
    let r = ok(request(empty()));
    const id = r.session.id;
    assert.equal(reportSession(r.state, id, 'Otro', 'texto').ok, false);
    r = ok(respondToRequest(r.state, id, true));
    assert.equal(reportSession(r.state, id, '', 'texto').ok, false, 'motivo obligatorio');
    r = ok(reportSession(r.state, id, 'Otro', 'No se presentó'));
    assert.equal(r.session.report.reason, 'Otro');
    assert.equal(reportSession(r.state, id, 'Otro', 'de nuevo').ok, false);
  });

  it('material: solo en sesiones confirmadas o finalizadas', () => {
    const material = { id: 'm1', title: 'Guía 1', kind: 'guia', meta: 'PDF', uploadedBy: 'Yo' };
    let r = ok(request(empty()));
    const id = r.session.id;
    assert.equal(addMaterial(r.state, id, material).ok, false);
    r = ok(respondToRequest(r.state, id, true));
    r = ok(addMaterial(r.state, id, material));
    assert.equal(r.session.materials.length, 1);
  });

  it('resolveClosure', () => {
    assert.equal(resolveClosure('completada', 'completada'), 'completada');
    assert.equal(resolveClosure('completada', 'no_realizada'), 'en_conflicto');
  });
});

describe('check-in por QR y ventana de la sesión', () => {
  const START = '2026-09-30T14:00:00.000Z';
  const END = '2026-09-30T15:00:00.000Z';

  it('fases: early -> open (15 min antes) -> closed', () => {
    assert.equal(getCheckInPhase(START, END, '2026-09-30T13:44:00.000Z'), 'early');
    assert.equal(getCheckInPhase(START, END, '2026-09-30T13:45:00.000Z'), 'open');
    assert.equal(getCheckInPhase(START, END, '2026-09-30T14:30:00.000Z'), 'open');
    assert.equal(getCheckInPhase(START, END, '2026-09-30T15:00:00.000Z'), 'closed');
  });

  it('no se puede hacer check-in antes de tiempo ni en sesiones no confirmadas', () => {
    let r = ok(request(empty()));
    const id = r.session.id;
    assert.equal(checkIn(r.state, id).ok, false, 'pendiente');
    r = ok(respondToRequest(r.state, id, true));
    assert.equal(checkIn(r.state, id).ok, false, 'faltan más de 15 minutos');
  });

  it('flujo: confirmada -> inicia -> ambos registran asistencia -> termina -> declaran', () => {
    let r = ok(request(empty()));
    const id = r.session.id;
    r = ok(respondToRequest(r.state, id, true));
    r = ok(startSessionNow(r.state, id));
    r = ok(checkIn(r.state, id));
    assert.ok(r.session.attendance.mine);
    assert.equal(checkIn(r.state, id).ok, false, 'no se registra dos veces');
    r = ok(counterpartCheckIn(r.state, id));
    assert.ok(r.session.attendance.theirs);
    r = ok(endSession(r.state, id));
    assert.equal(r.session.status, 'pendiente_cierre');
    assert.ok(r.session.attendance.mine && r.session.attendance.theirs, 'la asistencia se conserva al cerrar');
  });

  it('createRequest asigna un lugar por defecto', () => {
    assert.ok(ok(request(empty())).session.place);
  });
});

describe('formatCountdown (temporizador del ticket)', () => {
  it('menos de un día: HH:MM y segundos', () => {
    assert.deepEqual(formatCountdown((1 * 3600 + 29 * 60 + 58) * 1000), { main: '01:29', sub: '58s' });
    assert.deepEqual(formatCountdown(0), { main: '00:00', sub: '00s' });
  });
  it('un día o más: días y horas', () => {
    assert.deepEqual(formatCountdown((45 * 3600 + 59 * 60) * 1000), { main: '1d', sub: '21h' });
  });
  it('nunca muestra valores negativos', () => {
    assert.deepEqual(formatCountdown(-5000), { main: '00:00', sub: '00s' });
  });
});
