import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
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
